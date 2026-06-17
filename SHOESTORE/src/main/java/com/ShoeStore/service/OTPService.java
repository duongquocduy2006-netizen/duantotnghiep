package com.ShoeStore.service;

import java.util.Random;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpSession;

@Service
public class OTPService {

    public String generateOTP() {
        return String.format("%06d", new Random().nextInt(999999));
    }

    public void saveOTP(HttpSession session, String email, String otp) {
        session.setAttribute("otp_email", email);
        session.setAttribute("otp_code", otp);
        session.setAttribute("otp_time", System.currentTimeMillis());
    }

    public boolean validateOTP(HttpSession session, String email, String otp) {
        String savedEmail = (String) session.getAttribute("otp_email");
        String savedOtp = (String) session.getAttribute("otp_code");
        Long savedTime = (Long) session.getAttribute("otp_time");

        if (savedEmail == null || savedOtp == null || savedTime == null) {
            return false;
        }

        // Kiểm tra thời hạn 3 phút (180,000 ms)
        if (System.currentTimeMillis() - savedTime > 180000) {
            session.removeAttribute("otp_code");
            return false;
        }

        return savedEmail.equalsIgnoreCase(email) && savedOtp.equals(otp);
    }

    public void clearOTP(HttpSession session) {
        session.removeAttribute("otp_email");
        session.removeAttribute("otp_code");
        session.removeAttribute("otp_time");
    }
}
