"use client";
import "intl-tel-input/build/css/intlTelInput.css";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { forgotPassword } from "@/store/actions/authActions";
import { RootState } from "@/store/store";

import CountryDropdown from "@/app/components/CountryDropdown";
import { ForgotPasswordSkeleton } from "@/components/skeletons";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t, isRtl } = useTranslation();
  const lp = useLocalePath();
  const dispatch = useAppDispatch();
  const { loading: reduxLoading } = useAppSelector((state: RootState) => state.auth);

  // Flow State: 'input' | 'otp' | 'reset'
  const [step, setStep] = useState<"input" | "otp" | "reset">("input");
  // Reset Mode: 'email' | 'mobile'
  const [resetMode, setResetMode] = useState<"email" | "mobile">("email");

  // Form Data
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // The page renders synchronously on direct visits — without this gate the
  // skeleton would only appear during SPA navigation. Show it on SSR + first
  // client paint, then swap to the real form after hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.body.classList.add('scrollbar-hide');
    return () => document.body.classList.remove('scrollbar-hide');
  }, []);

  const getMobileRequirements = (code: string) => {
    if (code === "+966") return { length: 9, start: "5", example: "5xxxxxxxx" };
    if (code === "+971") return { length: 9, start: "5", example: "5xxxxxxxx" };
    if (code === "+91") return { length: 10, start: "6-9", example: "9xxxxxxxxx" };
    return { length: 8, start: "", example: "" };
  };

  const validateMobileFormat = (number: string, code: string) => {
    const req = getMobileRequirements(code);
    if (number.length !== req.length) return false;
    if (code === "+966" || code === "+971") return /^5/.test(number);
    if (code === "+91") return /^[6-9]/.test(number);
    return true;
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (step === "input") {
      if (resetMode === "email") {
        if (!email) newErrors.email = t("forgotPassword.emailRequired");
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t("forgotPassword.emailInvalid");
      } else {
        if (!mobileNumber) {
          newErrors.mobile = t("forgotPassword.mobileRequired");
        } else {
          const req = getMobileRequirements(countryCode);
          if (mobileNumber.length !== req.length) {
            newErrors.mobile = `${t("login.mustBe") || "Must be"} ${req.length} ${t("login.digits") || "digits"}`;
          } else if (!validateMobileFormat(mobileNumber, countryCode)) {
            newErrors.mobile = t("login.invalidMobileFormat") || "Invalid mobile format";
          }
        }
      }
    } else if (step === "otp") {
      if (!otp) newErrors.otp = t("forgotPassword.otpRequired");
      else if (otp.length < 4) newErrors.otp = t("forgotPassword.otpInvalid");
    } else if (step === "reset") {
      if (!newPassword) newErrors.password = t("forgotPassword.passwordRequired");
      else if (newPassword.length < 6) newErrors.password = t("forgotPassword.passwordMinLength");
      if (newPassword !== confirmPassword) newErrors.confirmPassword = t("forgotPassword.passwordMismatch");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSendEmailReset = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(t("forgotPassword.resetLinkSent"));
        router.push(lp("/login"));
      } else {
        const msg: string = data.message || "";
        const lower = msg.toLowerCase();
        if (
          lower.includes("not found") ||
          lower.includes("not exist") ||
          lower.includes("not registered") ||
          lower.includes("no such entity") ||
          lower.includes("no account") ||
          lower.includes("no user") ||
          lower.includes("no customer") ||
          res.status === 404
        ) {
          toast.error(t("login.emailNotFound"));
        } else {
          toast.error(msg || t("forgotPassword.resetLinkFailed"));
        }
      }

    } catch (error) {
      toast.error(t("forgotPassword.unexpectedError"));
    }

    setLoading(false);
  };

  const handleSendMobileOtp = async () => {
    if (loading) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileNumber, countryCode }),
      });

      const data = await res.json();

      if (res.ok && data.status !== "error" && data.success !== false) {
        toast.success(t("forgotPassword.otpSentSuccess"));
        setStep("otp");
      } else {
        const msg: string = data.message || "";
        const lower = msg.toLowerCase();
        if (
          lower.includes("not found") ||
          lower.includes("not exist") ||
          lower.includes("not registered") ||
          lower.includes("no such entity") ||
          lower.includes("no account") ||
          lower.includes("no user") ||
          lower.includes("no customer") ||
          res.status === 404
        ) {
          setErrors({ mobile: t("login.mobileNotFound") });
        } else {
          toast.error(t("forgotPassword.otpSentFailed"));
        }
      }
    } catch {
      toast.error(t("forgotPassword.otpSentFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/kleverapi/forget-password-mobile/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            mobile: mobileNumber,
            otp: otp,
            countryCode: countryCode
          })
        }
      );

      const data = await res.json();
      console.log(">>> VERIFY OTP CLIENT DATA:", data);

      if (res.ok) {
        toast.success(t("forgotPassword.otpVerified"));
        const token = typeof data === "string" ? data : (data.resetToken || data.token || "");
        setResetToken(token);
        setStep("reset");
      } else {
        const msg: string = data.message || "";
        const lower = msg.toLowerCase();
        if (
          lower.includes("invalid") ||
          lower.includes("expired") ||
          lower.includes("incorrect")
        ) {
          toast.error(t("forgotPassword.otpVerifyFailed"));
        } else if (
          lower.includes("not found") ||
          lower.includes("no account") ||
          lower.includes("no customer") ||
          res.status === 404
        ) {
          toast.error(t("login.mobileNotFound"));
        } else {
          toast.error(t("forgotPassword.otpVerifyFailed"));
        }
      }
    } catch (error) {
      toast.error(t("forgotPassword.otpVerifyFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setErrors({});

    // 1. Prepare only the required fields as per specifications
    const payload = {
      resetToken: resetToken,
      newPassword: newPassword,
      confirmPassword: confirmPassword,
    };

    console.log(">>> RESET PASSWORD: Submitting request...", payload);

    try {
      // 2. Send POST request to the reset API
      const res = await fetch("/api/kleverapi/forget-password-mobile/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log(">>> RESET PASSWORD: Response status:", res.status);
      console.log(">>> RESET PASSWORD: Response data:", data);

      if (res.ok) {
        // 3. Success handling
        toast.success(t("forgotPassword.passwordResetSuccess"));
        console.log(">>> RESET PASSWORD: Success");

        // Brief delay before redirecting to login
        setTimeout(() => {
          router.push(lp("/login"));
        }, 1500);
      } else {
        // 4. API Error handling — always use translated messages
        const msg: string = data.message || data.error || "";
        console.error(">>> RESET PASSWORD: API Error:", msg);
        toast.error(t("forgotPassword.passwordResetFailed"));
      }
    } catch (error: any) {
      // 5. Network or unexpected error handling
      console.error(">>> RESET PASSWORD: Exception occurred:", error);
      toast.error(t("forgotPassword.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (step === "input") {
      if (resetMode === "email") handleSendEmailReset();
      else handleSendMobileOtp();
    } else if (step === "otp") {
      handleVerifyOtp();
    } else if (step === "reset") {
      handleResetPassword();
    }
  };

  // Pre-hydration: render the skeleton so users always see a visible loading
  // state on direct visits (not just SPA navigation).
  if (!hydrated) return <ForgotPasswordSkeleton />;

  return (
    <div className="flex-1 w-full min-h-full bg-surfaceSubtle flex flex-col">
      <main className="flex-1 w-full flex justify-center items-start pt-6 sm:pt-8 md:pt-16 pb-8 sm:pb-12 px-4 md:px-0">
        <div className="w-full max-w-[440px] bg-white rounded-[3px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col overflow-hidden">

          {/* Header Section */}
          <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6">
            <div className="pb-4 border-b-[0.80px] border-gray-200">
              <div className="text-black text-base sm:text-lg font-bold uppercase tracking-wide">
                {step === 'input' ? t("forgotPassword.title") : step === 'otp' ? t("forgotPassword.verifyOtp") : t("forgotPassword.resetPassword")}
              </div>
            </div>

            {step === 'input' && (
              <div className="flex w-full rounded-[3px] overflow-hidden border border-gray-200">
                <button
                  type="button"
                  className={`flex-1 py-[14px] text-body font-semibold uppercase tracking-wider transition-all cursor-pointer ${resetMode === 'mobile' ? 'bg-primary text-black' : 'bg-white text-black hover:bg-gray-50'}`}
                  onClick={() => { setResetMode("mobile"); setErrors({}); }}
                >
                  {t("login.modeOtp")}
                </button>
                <button
                  type="button"
                  className={`flex-1 py-[14px] text-body font-semibold uppercase tracking-wider transition-all cursor-pointer border-l border-gray-100 ${resetMode === 'email' ? 'bg-primary text-black' : 'bg-white text-black hover:bg-gray-50'}`}
                  onClick={() => { setResetMode("email"); setErrors({}); }}
                >
                  {t("login.modePassword")}
                </button>
              </div>
            )}
          </div>

          {/* Form Content Section */}
          <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 flex flex-col gap-6">
            <div className="text-black/70 text-xs font-normal leading-5 sm:leading-4">
              {step === 'input'
                ? (resetMode === 'email' ? t("forgotPassword.emailSubtitle") : t("forgotPassword.mobileSubtitle"))
                : step === 'otp' ? `${t("forgotPassword.otpSubtitle")} ${countryCode} ${mobileNumber}`
                  : t("forgotPassword.resetSubtitle")}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-5" noValidate>

              {/* Step: Input Email or Mobile */}
              {step === "input" && (
                <>
                  {resetMode === "email" ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-black text-xs font-semibold uppercase tracking-tight">{t("forgotPassword.email")}</span>
                        <span className="text-red-600 text-xl font-semibold leading-none mt-1">*</span>
                      </div>
                      <input
                        id="email-input"
                        type="email"
                        placeholder={t("login.emailPlaceholder")}
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: "" }); }}
                        className={`w-full h-10 sm:h-11 bg-white px-3 text-sm rounded-[1px] outline outline-1 transition-all cursor-text ${errors.email ? 'outline-red-500' : 'outline-neutral-200 focus:outline-black focus:outline-2 focus:ring-1 focus:ring-black'}`}
                      />
                      {errors.email && <span className="text-red-500 text-label font-medium leading-none">{errors.email}</span>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 relative">
                      <div className="flex items-center gap-1">
                        <span className="text-black text-xs font-semibold uppercase tracking-tight">{t("forgotPassword.mobileNumber")}</span>
                        <span className="text-red-600 text-xl font-semibold leading-none mt-1">*</span>
                      </div>
                      <div
                        dir="ltr"
                        className={`relative flex flex-row items-stretch h-10 sm:h-11 bg-white rounded-[1px] outline outline-1 transition-all ${errors.mobile ? 'outline-red-500' : 'outline-neutral-200 focus-within:outline-black focus-within:outline-2'}`}
                      >
                        <CountryDropdown
                          selectedCountryCode={countryCode}
                          onSelect={(code) => setCountryCode(code)}
                        />
                        <input
                          id="mobile-input"
                          type="tel"
                          dir="ltr"
                          placeholder={t("login.mobilePlaceholder")}
                          value={mobileNumber}
                          onChange={(e) => { setMobileNumber(e.target.value.replace(/\D/g, "")); if (errors.mobile) setErrors({ ...errors, mobile: '' }); }}
                          className={`flex-1 px-3 text-sm outline-none cursor-text font-semibold placeholder:font-normal ${isRtl ? 'text-right' : 'text-left'}`}
                        />
                      </div>
                      {errors.mobile && <span className="text-red-500 text-label font-medium leading-none">{errors.mobile}</span>}
                    </div>
                  )}
                </>
              )}

              {/* Step: OTP Verification */}
              {step === "otp" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-black text-xs font-semibold uppercase tracking-tight">{t("login.verificationCode")}</span>
                    <span className="text-red-600 text-xl font-semibold leading-none mt-1">*</span>
                  </div>
                  <input
                    id="otp-input"
                    type="text"
                    placeholder={t("login.enterOtp")}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value); if (errors.otp) setErrors({ ...errors, otp: "" }); }}
                    className={`w-full h-10 sm:h-11 bg-white px-3 text-sm text-center font-bold tracking-[6px] sm:tracking-[8px] rounded-[1px] outline outline-1 transition-all placeholder:tracking-normal placeholder:font-normal cursor-text ${errors.otp ? 'outline-red-500' : 'outline-neutral-200 focus:outline-black focus:outline-2 focus:ring-1 focus:ring-black'}`}
                  />
                  {errors.otp && <span className="text-red-500 text-label font-medium leading-none">{errors.otp}</span>}
                  <button
                    type="button"
                    onClick={handleSendMobileOtp}
                    disabled={loading}
                    className="text-primary text-label font-semibold text-right mt-1 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t("forgotPassword.sending") : t("forgotPassword.resendCode")}
                  </button>
                </div>
              )}

              {/* Step: New Password */}
              {step === "reset" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-black text-xs font-semibold uppercase tracking-tight">{t("forgotPassword.newPassword")}</span>
                      <span className="text-red-600 text-xl font-semibold leading-none mt-1">*</span>
                    </div>
                    <input
                      id="new-password-input"
                      type="password"
                      placeholder={t("login.passwordPlaceholder")}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: "" }); }}
                      className={`w-full h-10 sm:h-11 bg-white px-3 text-sm rounded-[1px] outline outline-1 transition-all cursor-text ${errors.password ? 'outline-red-500' : 'outline-neutral-200 focus:outline-black focus:outline-2 focus:ring-1 focus:ring-black'}`}
                    />
                    {errors.password && <span className="text-red-500 text-label font-medium leading-none">{errors.password}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-black text-xs font-semibold uppercase tracking-tight">{t("forgotPassword.confirmPassword")}</span>
                      <span className="text-red-600 text-xl font-semibold leading-none mt-1">*</span>
                    </div>
                    <input
                      id="confirm-password-input"
                      type="password"
                      placeholder={t("forgotPassword.confirmPassword")}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" }); }}
                      className={`w-full h-10 sm:h-11 bg-white px-3 text-sm rounded-[1px] outline outline-1 transition-all cursor-text ${errors.confirmPassword ? 'outline-red-500' : 'outline-neutral-200 focus:outline-black focus:outline-2 focus:ring-1 focus:ring-black'}`}
                    />
                    {errors.confirmPassword && <span className="text-red-500 text-label font-medium leading-none">{errors.confirmPassword}</span>}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-3 sm:gap-4 mt-2">
                <button
                  id="submit-button"
                  type="submit"
                  disabled={loading || reduxLoading}
                  className="w-full h-12 bg-primary hover:bg-primaryHover rounded-[3px] flex justify-center items-center transition-all disabled:opacity-50 shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <div className="text-center text-black text-body font-bold uppercase tracking-wider cursor-pointer">
                    {loading || reduxLoading ? t("forgotPassword.sending") : (
                      step === 'input' ? (resetMode === 'email' ? t("forgotPassword.sendResetLink") : t("forgotPassword.sendOtp")) :
                        step === 'otp' ? t("forgotPassword.verifyOtpButton") : t("forgotPassword.resetPasswordButton")
                    )}
                  </div>
                </button>

                <div className="flex justify-between items-center">
                  <Link href={lp("/login")}>
                    <div className="text-black text-sm font-normal cursor-pointer hover:underline hover:text-primaryHover transition-colors">
                      {t("forgotPassword.backToLogin")}
                    </div>
                  </Link>
                  {step !== 'input' && (
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="text-black/60 text-sm font-normal cursor-pointer hover:underline"
                    >
                      {t("forgotPassword.changeMethod")}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}