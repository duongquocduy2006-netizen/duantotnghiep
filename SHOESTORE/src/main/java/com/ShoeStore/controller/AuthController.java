package com.ShoeStore.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

import com.ShoeStore.model.LoginRequest;
import com.ShoeStore.model.RegisterRequest;

import com.ShoeStore.service.EmailService;
import com.ShoeStore.service.OTPService;
import org.springframework.web.bind.annotation.RequestParam;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;

@Controller
public class AuthController {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EmailService emailService;

    @Autowired
    private OTPService otpService;

    // ----- GET: Hiển thị giao diện -----
    @GetMapping("/login")
    public String login(Model model) {
        model.addAttribute("loginRequest", new LoginRequest());
        return "login";
    }

    @GetMapping("/oauth2/redirect")
    public void handleOAuth2Redirect(jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        response.sendRedirect("http://localhost:5173/oauth2/redirect");
    }

    @GetMapping("/register")
    public String register(Model model) {
        model.addAttribute("registerRequest", new RegisterRequest());
        return "register";
    }

    // ----- POST: Xử lý Đăng Ký -----
    @PostMapping("/register")
    public String processRegister(
            @Valid @ModelAttribute("registerRequest") RegisterRequest registerRequest,
            BindingResult result,
            Model model) {

        if (result.hasErrors()) {
            return "register";
        }

        String email = registerRequest.getEmail();
        String password = registerRequest.getPassword();
        String fullName = registerRequest.getFullName();
        String confirmPassword = registerRequest.getConfirmPassword();

        // 1. Kiểm tra 2 mật khẩu
        if (!password.equals(confirmPassword)) {
            result.rejectValue("confirmPassword", "error.confirmPassword", "Mật khẩu nhập lại không khớp!");
            return "register";
        }

        // 2. Kiểm tra trùng Email
        String checkEmailSql = "SELECT COUNT(*) FROM accounts WHERE email = ?";
        Integer count = jdbc.queryForObject(checkEmailSql, Integer.class, email);

        if (count != null && count > 0) {
            result.rejectValue("email", "error.email", "Địa chỉ Email này đã được sử dụng!");
            return "register";
        }

        try {
            // 3. Tạo mã ngẫu nhiên
            String userCode = "U" + (System.currentTimeMillis() % 10000);

            // 4. Lưu vào Database
            String insertSql = "INSERT INTO accounts (user_code, email, password, full_name, role, status, membership_rank_id) "
                    +
                    "VALUES (?, ?, ?, ?, 'USER', 1, 1)";
            jdbc.update(insertSql, userCode, email, password, fullName);

            model.addAttribute("success", "Đăng ký thành công! Vui lòng đăng nhập.");
            return "register";

        } catch (Exception e) {
            model.addAttribute("error", "Có lỗi xảy ra: " + e.getMessage());
            return "register";
        }
    }

    // ----- QUÊN MẬT KHẨU -----

    @GetMapping("/forgot-password")
    public String forgotPassword() {
        return "forgot-password";
    }

    @PostMapping("/forgot-password")
    public String processForgotPassword(@RequestParam(value = "email", defaultValue = "") String email, org.springframework.web.servlet.mvc.support.RedirectAttributes redirectAttributes, HttpSession session) {
        if (email == null || email.trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Vui lòng nhập địa chỉ email!");
            return "redirect:/forgot-password";
        }

        String sql = "SELECT COUNT(*) FROM accounts WHERE email = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, email);

        if (count == null || count == 0) {
            redirectAttributes.addFlashAttribute("error", "Email không tồn tại trong hệ thống!");
            return "redirect:/forgot-password";
        }

        try {
            String otp = otpService.generateOTP();
            otpService.saveOTP(session, email, otp);
            emailService.sendOtpEmail(email, otp);
            
            redirectAttributes.addFlashAttribute("message", "Mã OTP đã được gửi đến email của bạn.");
            return "redirect:/verify-otp";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Lỗi gửi email: " + e.getMessage());
            return "redirect:/forgot-password";
        }
    }

    @GetMapping("/resend-otp")
    public String resendOtp(HttpSession session, org.springframework.web.servlet.mvc.support.RedirectAttributes redirectAttributes) {
        String email = (String) session.getAttribute("otp_email");
        if (email == null) {
            return "redirect:/forgot-password";
        }
        try {
            String otp = otpService.generateOTP();
            otpService.saveOTP(session, email, otp);
            emailService.sendOtpEmail(email, otp);
            
            redirectAttributes.addFlashAttribute("message", "Mã OTP mới đã được gửi lại vào email của bạn.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Lỗi gửi email: " + e.getMessage());
        }
        return "redirect:/verify-otp";
    }

    @GetMapping("/verify-otp")
    public String verifyOtp() {
        return "verify-otp";
    }

    @PostMapping("/verify-otp")
    public String processVerifyOtp(@RequestParam(value = "otp", defaultValue = "") String otp, HttpSession session, Model model) {
        if (otp == null || otp.trim().isEmpty() || otp.length() != 6) {
            model.addAttribute("error", "Vui lòng nhập đầy đủ mã OTP 6 số!");
            return "verify-otp";
        }

        String email = (String) session.getAttribute("otp_email");
        if (otpService.validateOTP(session, email, otp)) {
            session.setAttribute("otp_verified", true);
            return "reset-password";
        } else {
            model.addAttribute("error", "Mã OTP không chính xác hoặc đã hết hạn!");
            return "verify-otp";
        }
    }

    @GetMapping("/reset-password")
    public String resetPassword(HttpSession session) {
        if (session.getAttribute("otp_verified") == null) return "redirect:/forgot-password";
        return "reset-password";
    }

    @PostMapping("/reset-password")
    public String processResetPassword(@RequestParam("password") String password, 
                                      @RequestParam("confirmPassword") String confirmPassword,
                                      HttpSession session, Model model) {
        if (session.getAttribute("otp_verified") == null) return "redirect:/forgot-password";
        
        if (password == null || password.trim().isEmpty() || confirmPassword == null || confirmPassword.trim().isEmpty()) {
            model.addAttribute("error", "Vui lòng nhập đầy đủ mật khẩu mới!");
            return "reset-password";
        }

        if (!password.equals(confirmPassword)) {
            model.addAttribute("error", "Mật khẩu xác nhận không khớp!");
            return "reset-password";
        }

        String email = (String) session.getAttribute("otp_email");
        String sql = "UPDATE accounts SET password = ? WHERE email = ?";
        jdbc.update(sql, password, email);

        otpService.clearOTP(session);
        session.removeAttribute("otp_verified");

        model.addAttribute("success", "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        model.addAttribute("loginRequest", new LoginRequest());
        return "login";
    }
}

