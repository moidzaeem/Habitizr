import { randomBytes } from "crypto";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import mailchimp from '@mailchimp/mailchimp_transactional'

const mailchimps = mailchimp('md-UJtH5Tb5hNpohkzF59p1DQ');
const verificationTokens = new Map<string, { userId: number; expiry: Date }>();

export async function sendVerificationEmail(userId: number, email: string) {
  const token = randomBytes(32).toString("hex");
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // Token expires in 24 hours

  // Store the verification token
  await db
    .update(users)
    .set({ verificationToken: token })
    .where(eq(users.id, userId));

  verificationTokens.set(token, { userId, expiry });

  const verificationUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/verify-email?token=${token}`;
  console.log("Verification URL: ", verificationUrl);

  try {
    const response = await mailchimps.messages.send({
      message: {
        from_email: "no-reply@habitizr.com",
        subject: "Verify your email address",
        html: `
          <h1>Welcome to Habitizr!</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link will expire in 24 hours.</p>
        `,
        to: [{ email, type: "to" }],
      },
    });
    console.log("Email sent via mailchimps: ", response);
  } catch (error) {
    console.log("ERROR WHILE SENDING EMAIL: ", error);
  }
}

export async function verifyEmail(token: string): Promise<boolean> {
  const verification = verificationTokens.get(token);

  if (!verification || verification.expiry < new Date()) {
    return false;
  }

  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, verification.userId));

  verificationTokens.delete(token);
  return true;
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetURL = `${process.env.APP_URL || "http://localhost:5000"}/reset-password?token=${resetToken}`;

  try {
    const response = await mailchimps.messages.send({
      message: {
        from_email: "no-reply@habitizr.com",
        subject: "Password Reset Request",
        html: `
          <p>You requested a password reset. Please click the link below to reset your password:</p>
          <a href="${resetURL}">${resetURL}</a>
        `,
        to: [{ email, type: "to" }],
      },
    });
    console.log("Password reset email sent via Mailchimp: ", response);
  } catch (error) {
    console.log("ERROR WHILE SENDING PASSWORD RESET EMAIL: ", error);
  }
}
