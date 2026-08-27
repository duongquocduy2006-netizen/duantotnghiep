package com.ShoeStore.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class WalletService {

    @Autowired
    private JdbcTemplate jdbc;

    public void initWalletTables() {
        try {
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'wallet_balance') ALTER TABLE accounts ADD wallet_balance DECIMAL(18,2) DEFAULT 0.00;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'saved_bank_bin') ALTER TABLE accounts ADD saved_bank_bin NVARCHAR(50) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'saved_bank_account') ALTER TABLE accounts ADD saved_bank_account NVARCHAR(100) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'saved_account_name') ALTER TABLE accounts ADD saved_account_name NVARCHAR(200) NULL;");

            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'wallet_transactions') " +
                    "CREATE TABLE wallet_transactions (" +
                    "id BIGINT IDENTITY(1,1) PRIMARY KEY, " +
                    "user_id BIGINT NOT NULL, " +
                    "amount DECIMAL(18,2) NOT NULL, " +
                    "type NVARCHAR(50) NOT NULL, " + // REFUND, WITHDRAW
                    "description NVARCHAR(255) NULL, " +
                    "bank_bin NVARCHAR(50) NULL, " +
                    "bank_account NVARCHAR(100) NULL, " +
                    "account_name NVARCHAR(200) NULL, " +
                    "status INT DEFAULT 0, " + // 0: Chờ xử lý rút tiền, 1: Đã chuyển khoản thành công, 2: Từ chối rút tiền
                    "created_at DATETIME DEFAULT GETDATE()" +
                    ");");
        } catch (Exception ignored) {}
    }

    public double getWalletBalance(Long userId) {
        initWalletTables();
        try {
            Double val = jdbc.queryForObject("SELECT wallet_balance FROM accounts WHERE id = ?", Double.class, userId);
            return val != null ? val : 0.0;
        } catch (Exception e) {
            return 0.0;
        }
    }

    public List<Map<String, Object>> getWalletTransactions(Long userId) {
        initWalletTables();
        String sql = "SELECT id, amount, type, description, bank_bin, bank_account, account_name, status, created_at " +
                "FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC";
        return jdbc.queryForList(sql, userId);
    }

    public void requestWithdraw(Long userId, double amount, String bankBin, String bankAccount, String accountName) {
        initWalletTables();
        double currentBalance = getWalletBalance(userId);
        if (amount < 1000) {
            throw new IllegalArgumentException("Số tiền rút tối thiểu phải từ 1.000 VNĐ trở lên!");
        }
        if (amount > currentBalance) {
            throw new IllegalArgumentException("Số dư Ví Điện Tử không đủ để rút số tiền này!");
        }
        if (bankAccount == null || bankAccount.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập số tài khoản ngân hàng nhận tiền!");
        }

        // 1. Trừ tiền khỏi ví của khách (tạm giữ)
        jdbc.update("UPDATE accounts SET wallet_balance = wallet_balance - ?, saved_bank_bin = ?, saved_bank_account = ?, saved_account_name = ? WHERE id = ?",
                amount, bankBin, bankAccount.trim(), accountName, userId);

        // 2. Tạo yêu cầu rút tiền với status = 0 (Chờ Admin chuyển tiền)
        jdbc.update("INSERT INTO wallet_transactions (user_id, amount, type, description, bank_bin, bank_account, account_name, status) VALUES (?, ?, 'WITHDRAW', ?, ?, ?, ?, 0)",
                userId, amount, "Rút tiền từ Ví về tài khoản Ngân hàng", bankBin, bankAccount.trim(), accountName);
    }

    // --- ADMIN METHODS ---
    public List<Map<String, Object>> getAllWithdrawalsForAdmin() {
        initWalletTables();
        String sql = "SELECT wt.id, wt.user_id, wt.amount, wt.type, wt.description, wt.bank_bin, wt.bank_account, wt.account_name, wt.status, wt.created_at, " +
                "a.full_name, a.email, a.phone " +
                "FROM wallet_transactions wt " +
                "JOIN accounts a ON wt.user_id = a.id " +
                "WHERE wt.type = 'WITHDRAW' " +
                "ORDER BY wt.created_at DESC";
        return jdbc.queryForList(sql);
    }

    public void approveWithdrawal(Long txId) {
        initWalletTables();
        jdbc.update("UPDATE wallet_transactions SET status = 1 WHERE id = ?", txId);
    }

    public void rejectWithdrawal(Long txId, String reason) {
        initWalletTables();
        Map<String, Object> tx = jdbc.queryForMap("SELECT user_id, amount, status FROM wallet_transactions WHERE id = ?", txId);
        int currentStatus = ((Number) tx.get("status")).intValue();
        if (currentStatus != 0) {
            throw new IllegalStateException("Giao dịch này không ở trạng thái Chờ xử lý!");
        }

        Long userId = ((Number) tx.get("user_id")).longValue();
        double amount = ((Number) tx.get("amount")).doubleValue();

        // Cập nhật trạng thái từ chối (2)
        String desc = "Từ chối rút tiền: " + (reason != null && !reason.trim().isEmpty() ? reason.trim() : "Yêu cầu không hợp lệ");
        jdbc.update("UPDATE wallet_transactions SET status = 2, description = ? WHERE id = ?", desc, txId);

        // Hoàn lại tiền vào Ví cho khách
        jdbc.update("UPDATE accounts SET wallet_balance = wallet_balance + ? WHERE id = ?", amount, userId);
    }
}
