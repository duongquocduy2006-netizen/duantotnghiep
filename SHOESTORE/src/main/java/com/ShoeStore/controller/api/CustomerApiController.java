package com.ShoeStore.controller.api;

import com.ShoeStore.model.CustomerDTO;
import com.ShoeStore.service.CustomerService;
import com.ShoeStore.service.OrderService;
import com.ShoeStore.repository.MembershipRankRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/customers")
public class CustomerApiController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private MembershipRankRepository rankRepo;

    // 1. LẤY TOÀN BỘ KHÁCH HÀNG DÀNH CHO ADMIN
    @GetMapping
    public ResponseEntity<?> getAllCustomers() {
        try {
            List<CustomerDTO> customers = customerService.getAllCustomers();
            var ranks = rankRepo.findAll();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "customers", customers,
                    "ranks", ranks
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy danh sách khách hàng: " + e.getMessage()));
        }
    }

    // 2. CHI TIẾT KHÁCH HÀNG & LỊCH SỬ ĐƠN HÀNG
    @GetMapping("/{id}")
    public ResponseEntity<?> getCustomerDetail(@PathVariable Integer id) {
        try {
            CustomerDTO customer = customerService.getCustomerById(id);
            if (customer == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Không tìm thấy khách hàng!"));
            }
            List<Map<String, Object>> orders = orderService.getOrdersByUserId(id.longValue());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "customer", customer,
                    "orders", orders
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy chi tiết khách hàng: " + e.getMessage()));
        }
    }

    // 3. CẬP NHẬT HẠNG KHÁCH HÀNG
    @PostMapping("/update-rank")
    public ResponseEntity<?> updateRank(@RequestBody Map<String, Object> payload) {
        try {
            Integer userId = (Integer) payload.get("userId");
            Integer rankId = (Integer) payload.get("rankId");

            if (userId == null || rankId == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu userId hoặc rankId!"));
            }

            customerService.updateCustomerRank(userId, rankId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật hạng khách hàng thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi cập nhật hạng khách hàng: " + e.getMessage()));
        }
    }

    // 4. KHÓA / MỞ KHÓA TÀI KHOẢN KHÁCH HÀNG
    @PostMapping("/toggle-status")
    public ResponseEntity<?> toggleStatus(@RequestBody Map<String, Object> payload) {
        try {
            Integer id = (Integer) payload.get("userId");
            Integer status = (Integer) payload.get("status");

            if (id == null || status == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu userId hoặc status!"));
            }

            customerService.updateCustomerStatus(id, status);
            String msg = (status == 1) ? "Đã mở khóa tài khoản!" : "Đã khóa tài khoản thành công!";
            return ResponseEntity.ok(Map.of("success", true, "message", msg));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi thay đổi trạng thái tài khoản: " + e.getMessage()));
        }
    }


    // 5. CẬP NHẬT QUYỀN TRUY CẬP (ROLE) DÀNH CHO ADMIN
    @PostMapping("/update-role")
    public ResponseEntity<?> updateRole(@RequestBody Map<String, Object> payload) {
        try {
            Integer userId = (Integer) payload.get("userId");
            String role = (String) payload.get("role");

            if (userId == null || role == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu userId hoặc role!"));
            }

            if ("ADMIN".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("success", false, "message", "Hành động bị từ chối: Không được phép thao tác đổi sang ROLE ADMIN!"));
            }

            customerService.updateCustomerRole(userId, role);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đổi quyền (Role) thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi thay đổi quyền tài khoản: " + e.getMessage()));
        }
    }
}
