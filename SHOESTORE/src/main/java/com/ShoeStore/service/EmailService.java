package com.ShoeStore.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otp) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom("ShoeStore <support@shoestore.com>");
        helper.setTo(toEmail);
        helper.setSubject("Mã xác thực (OTP) đặt lại mật khẩu của bạn");

        String content = "<div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;'>" +
                "<h2>Chào bạn,</h2>" +
                "<p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản tại <strong>ShoeStore</strong>.</p>" +
                "<p>Mã OTP của bạn là: <span style='font-size: 24px; font-weight: bold; color: #e50914;'>" + otp + "</span></p>" +
                "<p>Mã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>" +
                "<br>" +
                "<p>Trân trọng,<br>Đội ngũ ShoeStore</p>" +
                "</div>";

        helper.setText(content, true);
        mailSender.send(message);
    }
    public void sendAccountLockedEmail(String toEmail) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("ShoeStore <support@shoestore.com>");
            helper.setTo(toEmail);
            helper.setSubject("Thông báo: Tài khoản của bạn đã bị khóa");

            String content = "<div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;'>" +
                    "<h2>Chào bạn,</h2>" +
                    "<p>Chúng tôi nhận thấy bạn vừa cố gắng đăng nhập vào <strong>ShoeStore</strong>.</p>" +
                    "<p style='color: #e50914; font-weight: bold;'>Tuy nhiên, tài khoản của bạn hiện đang ở trạng thái bị khóa.</p>" +
                    "<p>Để mở khóa hoặc biết thêm chi tiết, vui lòng liên hệ với quản trị viên qua email: <a href='mailto:admin@shoestore.com'>admin@shoestore.com</a></p>" +
                    "<br>" +
                    "<p>Trân trọng,<br>Đội ngũ ShoeStore</p>" +
                    "</div>";

            helper.setText(content, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Lỗi khi gửi mail thông báo khóa tài khoản: " + e.getMessage());
        }
    }
}
