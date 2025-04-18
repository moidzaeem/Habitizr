import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// In production, use a real SMTP service
const transporter = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: 587,
  secure: false,
  auth: {
    user: "no-reply@habitizr.com",
    pass: "FuzzyEagles87$",
  },
});

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

  const verificationUrl = `${process.env.APP_URL || "http://localhost:5000"}/verify-email?token=${token}`;
  console.log("Verification URL: ", verificationUrl);
  try {
    const sss = await transporter.sendMail({
      from: '"Habitizr" <no-reply@habitizr.com>',
      to: email,
      subject: "Verify your email address",
      html: `
      <h1>Welcome to Habitizr!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
    });
    console.log("Email sent: ", sss);
  } catch (error) {
console.log('ERROR WHILE SENDING EMAIL: ', error);
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


export async function sendPasswordResetEmail(email:string, resetToken:string) {

  // Generate the reset URL (could be a front-end route)
  const resetURL = `${process.env.APP_URL || "http://localhost:5000"}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: '"Habitizr" <no-reply@habitizr.com>',
    to: email,
    subject: "Password Reset Request",
    html: `<p>You requested a password reset. Please click the link below to reset your password:</p>
    <a href="${resetURL}">${resetURL}</a>`,
  });
}