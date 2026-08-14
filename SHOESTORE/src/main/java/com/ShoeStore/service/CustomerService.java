package com.ShoeStore.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.ShoeStore.model.CustomerDTO;

@Service
public class CustomerService {

    @Autowired
    private JdbcTemplate jdbc;

    public List<CustomerDTO> getAllCustomers() {
        // Query kết hợp 3 bảng, dùng COALESCE để gán 0đ cho khách chưa mua gì
        String sql = "SELECT a.id, a.full_name, a.email, a.phone, a.status, a.role, a.membership_rank_id, " +
                "mr.rank_name, mr.color_code, " +
                "COALESCE((SELECT SUM(final_amount) FROM orders o WHERE o.user_id = a.id AND o.status = 3), 0) as total_spent "
                +
                "FROM accounts a " +
                "LEFT JOIN membership_ranks mr ON a.membership_rank_id = mr.id " +
                "WHERE UPPER(ISNULL(a.role, 'USER')) IN ('USER', 'ADMIN', 'SHIPPER') " +
                "ORDER BY a.id DESC";

        return jdbc.query(sql, (rs, rowNum) -> {
            CustomerDTO dto = new CustomerDTO();
            dto.setId(rs.getInt("id"));
            dto.setFullName(rs.getString("full_name"));
            dto.setEmail(rs.getString("email"));
            dto.setPhone(rs.getString("phone"));
            dto.setStatus(rs.getInt("status"));
            dto.setRole(rs.getString("role"));
            dto.setRankId(rs.getObject("membership_rank_id") != null ? rs.getInt("membership_rank_id") : null);
            dto.setRankName(rs.getString("rank_name") != null ? rs.getString("rank_name") : "Đồng");
            dto.setRankColor(rs.getString("color_code") != null ? rs.getString("color_code") : "#94a3b8");
            dto.setTotalSpent(rs.getDouble("total_spent"));
            return dto;
        });
    }

    public void updateCustomerRank(Integer userId, Integer rankId) {
        // 1. Lấy số điểm tối thiểu của hạng mới
        Integer minPoints = jdbc.queryForObject(
                "SELECT min_points FROM membership_ranks WHERE id = ?", Integer.class, rankId);

        // 2. Cập nhật cả Hạng và Điểm để đảm bảo đồng bộ
        // Nếu admin hạ rank, điểm sẽ về mức sàn của rank đó.
        // Nếu admin nâng rank, điểm cũng sẽ lên mức sàn của rank mới.
        String sql = "UPDATE accounts SET membership_rank_id = ?, points = ? WHERE id = ?";
        jdbc.update(sql, rankId, minPoints != null ? minPoints : 0, userId);
    }

    public CustomerDTO getCustomerById(Integer id) {
        String sql = "SELECT a.id, a.full_name, a.email, a.phone, a.status, a.role, a.membership_rank_id, " +
                "mr.rank_name, mr.color_code, " +
                "COALESCE((SELECT SUM(final_amount) FROM orders o WHERE o.user_id = a.id AND o.status = 3), 0) as total_spent "
                +
                "FROM accounts a " +
                "LEFT JOIN membership_ranks mr ON a.membership_rank_id = mr.id " +
                "WHERE a.id = ?";

        try {
            return jdbc.queryForObject(sql, (rs, rowNum) -> {
                CustomerDTO dto = new CustomerDTO();
                dto.setId(rs.getInt("id"));
                dto.setFullName(rs.getString("full_name"));
                dto.setEmail(rs.getString("email"));
                dto.setPhone(rs.getString("phone"));
                dto.setStatus(rs.getInt("status"));
                dto.setRole(rs.getString("role"));
                dto.setRankId(rs.getObject("membership_rank_id") != null ? rs.getInt("membership_rank_id") : null);
                dto.setRankName(rs.getString("rank_name") != null ? rs.getString("rank_name") : "Đồng");
                dto.setRankColor(rs.getString("color_code") != null ? rs.getString("color_code") : "#94a3b8");
                dto.setTotalSpent(rs.getDouble("total_spent"));
                return dto;
            }, id);
        } catch (Exception e) {
            return null;
        }
    }

    public void updateCustomerStatus(Integer userId, Integer status) {
        String sql = "UPDATE accounts SET status = ? WHERE id = ?";
        jdbc.update(sql, status, userId);
    }

    public void updateCustomerRole(Integer userId, String role) {
        String sql = "UPDATE accounts SET role = ? WHERE id = ?";
        jdbc.update(sql, role, userId);
    }
}