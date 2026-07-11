"use client";

import "intl-tel-input/build/css/intlTelInput.css";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signOut, useSession, getSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sendOtp } from "@/store/actions/authActions";
import { RootState } from "@/store/store";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";
import CountryDropdown from "@/app/components/CountryDropdown";
import { LoginSkeleton } from "@/components/skeletons";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, isRtl } = useTranslation();
  const lp = useLocalePath();
  const [mode, setMode] = useState<"password" | "otp">("password");

  // Server-passed session makes useSession resolve synchronously, so the
  // `status === "loading"` branch below never fires on direct visits. Render
  // the skeleton on the SSR pass + first client paint, then swap in the form
  // after hydration so users always see a visible loading state.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const { loading: reduxLoading } = useAppSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (status === "authenticated") {
      const sess = session as any;
      if (sess?.error === "MagentoTokenExpired") {
        signOut({ redirect: false });
        return;
      }
      if (sess?.accessToken) {
        // No callbackUrl → go to the locale/store root and let middleware apply the
        // single landing-path strategy (getDefaultLandingPath → first menu category).
        const callbackUrl = searchParams.get("callbackUrl") || lp("/");
        window.location.href = callbackUrl;
      }
    }
  }, [status, session, lp, searchParams]);

  useEffect(() => {
    document.body.classList.add('scrollbar-hide');
    return () => document.body.classList.remove('scrollbar-hide');
  }, []);

  useEffect(() => {
    const qp = searchParams.get("mode");
    if (qp === "otp" || qp === "password") {
      setMode(qp);
    }
  }, [searchParams]);

  // Session resolving → show spinner (not blank). Authenticated → null while
  // the redirect fires. All hooks are above this line (Rules of Hooks satisfied).
  // `mounted` gate ensures skeleton shows on initial hydration even when the
  // server pre-populated session causes status to skip the "loading" state.
  if (!mounted || status === "loading") return <LoginSkeleton />;
  if (status === "authenticated") return null;

  const getMobileRequirements = (code: string) => {
    if (code === "+966") return { length: 9, start: "5", example: "5xxxxxxxx" };
    if (code === "+971") return { length: 9, start: "5", example: "5xxxxxxxx" };
    if (code === "+91") return { length: 10, start: "6-9", example: "9xxxxxxxxx" };
    return { length: 8, start: "", example: "" };
  };

  const validateMobile = (number: string, code: string) => {
    const req = getMobileRequirements(code);
    if (number.length !== req.length) return false;
    if (code === "+966" || code === "+971") return /^5/.test(number);
    if (code === "+91") return /^[6-9]/.test(number);
    return true;
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (mode === "password") {
      if (!email) newErrors.email = t("forgotPassword.emailRequired") || "Email is required";
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t("forgotPassword.emailInvalid") || "Invalid email format";
      if (!password) newErrors.password = t("forgotPassword.passwordRequired") || "Password is required";
    } else {
      if (!mobileNumber) {
        newErrors.mobile = t("forgotPassword.mobileRequired") || "Mobile number is required";
      } else {
        const req = getMobileRequirements(countryCode);
        if (mobileNumber.length !== req.length) {
          newErrors.mobile = `${t("login.mustBe") || "Must be"} ${req.length} ${t("login.digits") || "digits"}`;
        } else if (!validateMobile(mobileNumber, countryCode)) {
          newErrors.mobile = t("login.invalidMobileFormat") || "Invalid format";
        }
      }
      if (otpSent && !otp) newErrors.otp = t("forgotPassword.otpRequired") || "OTP is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrors({});

    if (!mobileNumber) {
      setErrors({ mobile: t("forgotPassword.mobileRequired") || "Mobile number is required" });
      return;
    }

    const req = getMobileRequirements(countryCode);
    if (mobileNumber.length !== req.length) {
      setErrors({ mobile: `${t("login.mustBe") || "Must be"} ${req.length} ${t("login.digits") || "digits"}` });
      return;
    }

    if (!validateMobile(mobileNumber, countryCode)) {
      setErrors({ mobile: t("login.invalidMobileFormat") || "Invalid format" });
      return;
    }

    dispatch(sendOtp(mobileNumber, countryCode, (err, data) => {
      if (!err) {
        toast.success(t("login.otpSent"));
        setOtpSent(true);
      } else {
        // Detect "account not found" style messages so we can show the
        // translated toast instead of the raw English string from the API.
        // Backend variations seen: "not exist", "doesn't exist", "does not
        // exist", "not found", "not registered", "no account", "invalid mobile".
        const errMsg = String(err).toLowerCase();
        const notFoundPatterns = [
          "not exist", "doesn't exist", "does not exist", "don't exist",
          "not found", "not registered", "no account", "no user",
          "invalid mobile", "invalid number", "invalid phone",
        ];
        if (notFoundPatterns.some((p) => errMsg.includes(p))) {
          toast.error(t("login.mobileNotFound"));
        } else {
          toast.error(err || t("login.otpSendFailed"));
        }
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const locale = window.location.pathname.startsWith('/ar') ? 'ar' : 'en';

    if (mode === "password") {
      try {
        const magentoRes = await fetch("/api/kleverapi/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email, password }),
        });
        const magentoData = await magentoRes.json();

        const magentoToken = typeof magentoData === "string"
          ? magentoData.replace(/"/g, "").trim()
          : magentoData?.token || magentoData;

        if (magentoRes.ok && magentoToken) {
          const cleanToken = String(magentoToken).replace(/"/g, "").trim();
          localStorage.setItem("token", cleanToken);
        }

        const res = await signIn("credentials", {
          email,
          password,
          locale,
          redirect: false,
        });

        if (res?.ok) {
          for (let i = 0; i < 15; i++) {
            const session: any = await getSession();
            if (session?.accessToken) break;
            await new Promise(r => setTimeout(r, 200));
          }
          toast.success(t("login.loginSuccess"));
          // No callbackUrl → defer to middleware's single landing strategy via the root.
          const callbackUrl = searchParams.get("callbackUrl") || lp("/");
          window.location.href = callbackUrl;
        } else {
          localStorage.removeItem("token");
          toast.error(t("login.loginFailed"));
        }
      } catch (err: any) {
        toast.error(t("login.loginFailed"));
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const res = await signIn("credentials", {
          mobile: mobileNumber,
          otp: otp,
          countryCode: countryCode,
          locale,
          redirect: false,
        });

        if (res?.ok) {
          for (let i = 0; i < 15; i++) {
            const session: any = await getSession();
            if (session?.accessToken) {
              // Store the validated token for non-NextAuth API calls
              localStorage.setItem("token", String(session.accessToken).trim());
              break;
            }
            await new Promise(r => setTimeout(r, 200));
          }
          toast.success(t("login.loginSuccess"));
          // No callbackUrl → defer to middleware's single landing strategy via the root.
          const callbackUrl = searchParams.get("callbackUrl") || lp("/");
          window.location.href = callbackUrl;
        } else {
          localStorage.removeItem("token");
          toast.error(t("login.loginFailed"));
        }
      } catch (err) {
        toast.error(t("login.loginFailed"));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 w-full min-h-full bg-surfaceSubtle flex flex-col">
      <main className="flex-1 w-full flex justify-center items-start pt-6 sm:pt-8 md:pt-16 pb-8 sm:pb-12 px-4 md:px-0">
        <div className="w-full max-w-[440px] bg-white rounded-[3px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100">
          <div className="px-4 sm:px-6 md:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5">
            <div className="text-left">
              <h1 className="text-[17px] sm:text-[18px] font-bold tracking-[0.5px] uppercase text-black">
                {t("login.title")}
              </h1>
            </div>
          </div>

          <div className="px-4 sm:px-6 md:px-8">
            <div className="flex w-full rounded-[3px] overflow-hidden border border-gray-200">
              <button
                type="button"
                className={`flex-1 min-w-0 px-2 py-2.5 sm:py-[14px] text-center text-[11px] sm:text-body font-semibold uppercase tracking-normal sm:tracking-wider leading-tight break-words transition-all cursor-pointer ${mode === 'otp' ? 'bg-primary text-black' : 'bg-white text-black hover:bg-gray-50'}`}
                onClick={() => { setMode("otp"); setOtpSent(false); setErrors({}); window.history.replaceState(null, "", lp("/login?mode=otp")); }}
              >
                {t("login.modeOtp")}
              </button>
              <button
                type="button"
                className={`flex-1 min-w-0 px-2 py-2.5 sm:py-[14px] text-center text-[11px] sm:text-body font-semibold uppercase tracking-normal sm:tracking-wider leading-tight break-words transition-all cursor-pointer border-l border-gray-100 ${mode === 'password' ? 'bg-primary text-black' : 'bg-white text-black hover:bg-gray-50'}`}
                onClick={() => { setMode("password"); setOtpSent(false); setErrors({}); window.history.replaceState(null, "", lp("/login?mode=password")); }}
              >
                {t("login.modePassword")}
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8">
            <p className="text-body text-black/60 font-semibold leading-relaxed mb-5">
              {mode === 'password' ? t("login.signInWithEmail") : t("login.signInWithMobile")}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-[14px]" noValidate>
              {mode === 'password' ? (
                <>
                  <div className="flex flex-col gap-[5px]">
                    <label className="block text-body font-semibold text-black uppercase tracking-widest cursor-pointer">
                      {t("login.emailLabel")} <span className="text-red-600 font-bold">*</span>
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      placeholder={t("login.emailPlaceholder")}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: '' }); }}
                      className={`w-full h-[48px] bg-white px-3 text-body border transition-all outline-none cursor-text font-semibold placeholder:font-normal ${errors.email ? 'border-red-500' : 'border-gray-300 focus:border-gray-600'}`}
                    />
                    {errors.email && <span className="text-red-500 text-label font-semibold text-[13px]">{errors.email}</span>}
                  </div>

                  <div className="flex flex-col gap-[5px]">
                    <label className="block text-body font-semibold text-black uppercase tracking-widest cursor-pointer">
                      {t("login.passwordLabel")} <span className="text-red-600 font-bold">*</span>
                    </label>
                    <input
                      id="password-input"
                      type="password"
                      placeholder={t("login.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: '' }); }}
                      className={`w-full h-[48px] bg-white px-3 text-body border transition-all outline-none cursor-text font-semibold placeholder:font-normal ${errors.password ? 'border-red-500' : 'border-gray-300 focus:border-gray-600'}`}
                    />
                    {errors.password && <span className="text-red-500 text-label font-semibold text-[13px]">{errors.password}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-[5px] relative">
                    <label className="block text-body font-semibold text-black uppercase tracking-widest">
                      {t("login.mobileNumberLabel")} <span className="text-red-600 font-bold">*</span>
                    </label>
                    <div
                      dir="ltr"
                      className={`relative flex flex-row items-stretch w-full h-[46px] sm:h-[48px] bg-white border transition-all ${errors.mobile ? 'border-red-500' : 'border-gray-300 focus-within:border-gray-600'}`}
                    >
                      <CountryDropdown
                        selectedCountryCode={countryCode}
                        onSelect={(code) => setCountryCode(code)}
                      />
                      <input
                        id="mobile-input-login"
                        type="tel"
                        dir="ltr"
                        inputMode="numeric"
                        maxLength={getMobileRequirements(countryCode).length}
                        placeholder={t("login.mobilePlaceholder")}
                        value={mobileNumber}
                        onChange={(e) => { setMobileNumber(e.target.value.replace(/\D/g, "")); if (errors.mobile) setErrors({ ...errors, mobile: '' }); }}
                        className={`flex-1 min-w-0 px-3 text-body outline-none bg-transparent cursor-text font-semibold placeholder:font-normal ${isRtl ? 'text-right' : 'text-left'}`}
                      />
                    </div>
                    {errors.mobile && <span className="text-red-500 text-label font-bold text-[13px]">{errors.mobile}</span>}
                  </div>

                  {otpSent && (
                    <div className="flex flex-col gap-[5px]">
                      <label className="block text-body font-semibold text-black uppercase tracking-widest">
                        {t("login.verificationCode")} <span className="text-red-600 font-bold">*</span>
                      </label>
                      <input
                        id="otp-input"
                        type="text"
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value); if (errors.otp) setErrors({ ...errors, otp: '' }); }}
                        className={`w-full h-[48px] bg-white px-3 text-body border transition-all outline-none text-center font-semibold tracking-[8px] cursor-text placeholder:font-normal placeholder:tracking-normal ${errors.otp ? 'border-red-500' : 'border-gray-300 focus:border-gray-600'}`}
                        placeholder={t("login.enterOtp")}
                      />
                      {errors.otp && <span className="text-red-500 text-label font-bold text-[13px]">{errors.otp}</span>}
                    </div>
                  )}
                </>
              )}

              <div className="pt-2 flex flex-col gap-3">
                <button
                  id="submit-button"
                  type={mode === 'otp' && !otpSent ? 'button' : 'submit'}
                  disabled={loading || reduxLoading}
                  onClick={mode === 'otp' && !otpSent ? handleSendOtp : undefined}
                  className="w-full h-10 sm:h-[46px] bg-primary hover:bg-primaryHover text-black font-semibold uppercase transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98] tracking-widest text-body rounded-sm"
                >
                  {mode === 'otp' && !otpSent ? t("forgotPassword.sendOtp") : (loading || reduxLoading ? t("login.pleaseWait") : t("login.signIn"))}
                </button>

                <div className="text-right">
                  <Link href={lp("/forgot-password")}>
                    <span className="text-body font-semibold text-black/80 hover:text-black cursor-pointer hover:underline underline-offset-2 py-2 inline-block">
                      {t("login.forgotPassword")}
                    </span>
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}