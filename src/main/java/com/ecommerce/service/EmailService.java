package com.ecommerce.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.domain}")
    private String appDomain;

    @Async
    public void sendVerificationEmail(String toEmail, String token) {
        String verifyUrl = appDomain + "/verify-email?code=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("[E-Commerce] Please Activate Your Account");
        message.setText("Hello! Thank you for registering with our E-Commerce.\n\n"
                + "Please click the link below to verify your email and activate your account:\n"
                + verifyUrl + "\n\n"
                + "If this was not initiated by you, please ignore this email.");

        mailSender.send(message);
    }
}