package com.ShoeStore.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginRequest {
    @NotBlank(message = "Vui lòng nhập Email!")
    @Email(message = "Email không đúng định dạng!")
    private String email;

    @NotBlank(message = "Vui lòng nhập mật khẩu!")
    private String password;
}
