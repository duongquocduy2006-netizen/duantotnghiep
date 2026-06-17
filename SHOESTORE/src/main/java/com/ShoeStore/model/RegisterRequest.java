package com.ShoeStore.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "Vui lòng nhập họ và tên!")
    private String fullName;

    @NotBlank(message = "Vui lòng nhập địa chỉ Email!")
    @Email(message = "Email không đúng định dạng!")
    private String email;

    @NotBlank(message = "Vui lòng nhập mật khẩu!")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự!")
    private String password;

    @NotBlank(message = "Vui lòng xác nhận mật khẩu!")
    private String confirmPassword;

    @jakarta.validation.constraints.AssertTrue(message = "Bạn phải đồng ý với điều khoản sử dụng!")
    private boolean agreeTerms;
}
