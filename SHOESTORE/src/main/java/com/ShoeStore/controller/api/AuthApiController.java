package com.ShoeStore.controller.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import com.ShoeStore.model.LoginRequest;
import com.ShoeStore.model.RegisterRequest;
import com.ShoeStore.service.CustomUserDetailsService;
import com.ShoeStore.service.EmailService;
import com.ShoeStore.service.OTPService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthApiController {

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EmailService emailService;

    @Autowired
    private OTPService otpService;

    // ==================== ĐĂNG NHẬP ====================
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest,
            BindingResult bindingResult,
            HttpServletRequest request,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();

        // 1. Kiểm tra validation
        if (bindingResult.hasErrors()) {
            response.put("success", false);
            response.put("message", bindingResult.getFieldError().getDefaultMessage());
            return ResponseEntity.badRequest().body(response);
        }

        String email = loginRequest.getEmail();
        String password = loginRequest.getPassword();

        try {
            // 2. Tải thông tin người dùng (có kiểm tra khóa tài khoản)
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            // 3. So khớp mật khẩu
            if (!passwordEncoder.matches(password, userDetails.getPassword())) {
                response.put("success", false);
                response.put("message", "Email hoặc mật khẩu không chính xác!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // 4. Đăng nhập thành công -> Thiết lập SecurityContext
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());

            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authentication);
            SecurityContextHolder.setContext(securityContext);

            // Lưu SecurityContext vào session để duy trì phiên đăng nhập
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);

            // 5. Lấy toàn bộ thông tin tài khoản và lưu vào session
            String sql = "SELECT id, password, role, full_name, status, email, phone, points, membership_rank_id FROM accounts WHERE email = ?";
            Map<String, Object> account = jdbc.queryForMap(sql, email);
            session.setAttribute("account", account);

            // 6. Xác định trang chuyển hướng dựa trên vai trò (Role)
            String role = (String) account.get("role");
            String redirectUrl = "/";
            if ("ADMIN".equalsIgnoreCase(role)) {
                redirectUrl = "/admin/dashboard";
            } else if ("SHIPPER".equalsIgnoreCase(role)) {
                redirectUrl = "/shipper/dashboard";
            }

            response.put("success", true);
            response.put("message", "Đăng nhập thành công!");
            response.put("role", role);
            response.put("redirectUrl", redirectUrl);
            response.put("account", account);

            return ResponseEntity.ok(response);

        } catch (UsernameNotFoundException e) {
            response.put("success", false);
            response.put("message", "Email hoặc mật khẩu không chính xác!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (LockedException e) {
            response.put("success", false);
            response.put("message", "Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Admin.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Có lỗi hệ thống xảy ra: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // ==================== ĐĂNG KÝ ====================
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            response.put("success", false);
            response.put("message", "Mật khẩu xác nhận không khớp!");
            return ResponseEntity.badRequest().body(response);
        }

        String checkEmailSql = "SELECT COUNT(*) FROM accounts WHERE email = ?";
        Integer count = jdbc.queryForObject(checkEmailSql, Integer.class, request.getEmail());

        if (count != null && count > 0) {
            response.put("success", false);
            response.put("message", "Địa chỉ Email này đã được sử dụng!");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            String userCode = "U" + (System.currentTimeMillis() % 10000);
            String insertSql = "INSERT INTO accounts (user_code, email, password, full_name, role, status, membership_rank_id) VALUES (?, ?, ?, ?, 'USER', 1, 1)";
            jdbc.update(insertSql, userCode, request.getEmail(), request.getPassword(), request.getFullName());

            response.put("success", true);
            response.put("message", "Đăng ký thành công!");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Có lỗi xảy ra: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // ==================== KIỂM TRA SESSION ====================
    @GetMapping("/session")
    public ResponseEntity<?> getSessionInfo(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");

        if (account != null) {
            response.put("authenticated", true);
            response.put("account", account);
            response.put("role", account.get("role"));
        } else {
            response.put("authenticated", false);
        }
        return ResponseEntity.ok(response);
    }

    // ==================== LẤY THÔNG TIN USER HIỆN TẠI ====================
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        Map<String, Object> response = new HashMap<>();

        if (account != null) {
            response.put("success", true);
            response.put("account", account);
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "Bạn chưa đăng nhập!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    // ==================== ĐĂNG XUẤT ====================
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpSession session) {
        SecurityContextHolder.clearContext();
        session.invalidate();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đăng xuất thành công!");
        return ResponseEntity.ok(response);
    }

    // ==================== QUÊN MẬT KHẨU REST ENDPOINTS ====================
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        String email = body.get("email");

        if (email == null || email.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Vui lòng nhập địa chỉ email!");
            return ResponseEntity.badRequest().body(response);
        }

        String sql = "SELECT COUNT(*) FROM accounts WHERE email = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, email);

        if (count == null || count == 0) {
            response.put("success", false);
            response.put("message", "Email không tồn tại trong hệ thống!");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            String otp = otpService.generateOTP();
            otpService.saveOTP(session, email, otp);
            emailService.sendOtpEmail(email, otp);

            response.put("success", true);
            response.put("message", "Mã OTP đã được gửi đến email của bạn.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi gửi email: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> body, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        String email = body.get("email");
        if (email == null || email.trim().isEmpty()) {
            email = (String) session.getAttribute("otp_email");
        }

        if (email == null) {
            response.put("success", false);
            response.put("message", "Không tìm thấy thông tin email để gửi lại mã!");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            String otp = otpService.generateOTP();
            otpService.saveOTP(session, email, otp);
            emailService.sendOtpEmail(email, otp);

            response.put("success", true);
            response.put("message", "Mã OTP mới đã được gửi lại vào email của bạn.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi gửi email: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        String otp = body.get("otp");
        String email = body.get("email");

        if (otp == null || otp.trim().isEmpty() || otp.length() != 6) {
            response.put("success", false);
            response.put("message", "Vui lòng nhập đầy đủ mã OTP 6 số!");
            return ResponseEntity.badRequest().body(response);
        }

        if (email == null || email.trim().isEmpty()) {
            email = (String) session.getAttribute("otp_email");
        }

        if (email == null) {
            response.put("success", false);
            response.put("message", "Không tìm thấy thông tin email xác thực!");
            return ResponseEntity.badRequest().body(response);
        }

        if (otpService.validateOTP(session, email, otp)) {
            session.setAttribute("otp_verified", true);
            session.setAttribute("otp_email", email);
            response.put("success", true);
            response.put("message", "Xác thực OTP thành công!");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "Mã OTP không chính xác hoặc đã hết hạn!");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        String email = body.get("email");
        String password = body.get("password");
        String confirmPassword = body.get("confirmPassword");

        Boolean verified = (Boolean) session.getAttribute("otp_verified");
        String sessionEmail = (String) session.getAttribute("otp_email");

        if (email == null || email.trim().isEmpty()) {
            email = sessionEmail;
        }

        if (verified == null || !verified || email == null || !email.equalsIgnoreCase(sessionEmail)) {
            response.put("success", false);
            response.put("message", "Yêu cầu không hợp lệ hoặc phiên xác thực đã hết hạn!");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        if (password == null || password.trim().isEmpty() || confirmPassword == null || confirmPassword.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Vui lòng nhập đầy đủ mật khẩu mới!");
            return ResponseEntity.badRequest().body(response);
        }

        if (!password.equals(confirmPassword)) {
            response.put("success", false);
            response.put("message", "Mật khẩu xác nhận không khớp!");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            String sql = "UPDATE accounts SET password = ? WHERE email = ?";
            jdbc.update(sql, password, email);

            otpService.clearOTP(session);
            session.removeAttribute("otp_verified");

            response.put("success", true);
            response.put("message", "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi cập nhật mật khẩu: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
