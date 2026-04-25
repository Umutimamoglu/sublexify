package com.sublex.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${mail.from:noreply@sublexify.com}")
    private String fromAddress;

    @Async
    public void sendPasswordResetEmail(String toEmail, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Sublexify — Şifre Sıfırlama Kodun");
            helper.setText(buildEmailHtml(code), true);

            mailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildEmailHtml(String code) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
                <tr>
                  <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1b2e;border-radius:20px;border:1px solid #2a2b4a;overflow:hidden;">
                      <!-- Header -->
                      <tr>
                        <td style="padding:36px 40px 28px;text-align:center;background:linear-gradient(135deg,#1a1b3e,#0d1040);">
                          <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:18px;margin-bottom:16px;">
                            <span style="font-size:28px;">📚</span>
                          </div>
                          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Sublexify</h1>
                          <p style="margin:6px 0 0;color:#8b8fa8;font-size:14px;">Film ve dizilerle İngilizce öğren</p>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding:40px 40px 32px;">
                          <h2 style="margin:0 0 8px;color:#e2e4f0;font-size:20px;font-weight:700;">Şifre Sıfırlama Kodu</h2>
                          <p style="margin:0 0 32px;color:#8b8fa8;font-size:15px;line-height:1.6;">
                            Aşağıdaki 6 haneli kodu kullanarak şifreni sıfırlayabilirsin. Bu kod <strong style="color:#c4c6d8;">15 dakika</strong> geçerlidir.
                          </p>
                          <!-- OTP Box -->
                          <div style="background:#0f1117;border:2px solid #6366f1;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                            <p style="margin:0 0 8px;color:#8b8fa8;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Doğrulama Kodu</p>
                            <p style="margin:0;color:#ffffff;font-size:44px;font-weight:900;letter-spacing:12px;font-family:'Courier New',monospace;">%s</p>
                          </div>
                          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                            Bu kodu sen istemediysen bu emaili görmezden gelebilirsin. Hesabın güvende, herhangi bir değişiklik yapılmadı.
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding:20px 40px 28px;border-top:1px solid #2a2b4a;text-align:center;">
                          <p style="margin:0;color:#4b5563;font-size:12px;">© 2025 Sublexify · <a href="mailto:support@sublexify.com" style="color:#6366f1;text-decoration:none;">Destek</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(code);
    }
}
