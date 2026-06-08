"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

interface MatchedAccount {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  birthdate: string | null;
  profilePicture: string | null;
}

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  component?: React.ReactNode;
}

export default function AiHelpPage() {
  const router = useRouter();

  // Chat stage flow:
  // 'first_name' | 'last_name' | 'birthdate' | 'phone' | 'searching' | 'select' | 'send_otp' | 'verify_otp' | 'success'
  const [currentStage, setCurrentStage] = useState<
    | "first_name"
    | "last_name"
    | "birthdate"
    | "phone"
    | "searching"
    | "select"
    | "send_otp"
    | "verify_otp"
    | "success"
  >("first_name");

  // Message history
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Form fields stored as we progress
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Backend search results
  const [accounts, setAccounts] = useState<MatchedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MatchedAccount | null>(null);

  // UI state errors
  const [error, setError] = useState("");
  const [recoveredUsername, setRecoveredUsername] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Autoscroll when message list updates or bot status changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Initial welcome on component mount
  useEffect(() => {
    setIsTyping(true);
    const welcomeTimer = setTimeout(() => {
      setMessages([
        {
          id: "welcome-1",
          sender: "ai",
          text: "Hi there! I am Grace, your AI Account Recovery assistant. 🤖",
        },
      ]);
      const promptTimer = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: "welcome-2",
            sender: "ai",
            text: "Let's retrieve your HGF Connect credentials so you can log in. First, what is your First Name?",
          },
        ]);
        setIsTyping(false);
      }, 1000);
      return () => clearTimeout(promptTimer);
    }, 600);

    return () => clearTimeout(welcomeTimer);
  }, []);

  // Handle standard text inputs (First Name, Last Name)
  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = inputValue.trim();
    if (!val) return;
    setInputValue("");

    if (currentStage === "first_name") {
      setFirstName(val);
      setMessages((prev) => [...prev, { id: `user-fn-${Date.now()}`, sender: "user", text: val }]);
      setCurrentStage("last_name");
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `ai-ln-${Date.now()}`, sender: "ai", text: `Got it. And what is your Last Name?` },
        ]);
        setIsTyping(false);
      }, 800);
    } else if (currentStage === "last_name") {
      setLastName(val);
      setMessages((prev) => [...prev, { id: `user-ln-${Date.now()}`, sender: "user", text: val }]);
      setCurrentStage("birthdate");
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `ai-bd-${Date.now()}`, sender: "ai", text: `Great. Please select or enter your Birthdate:` },
        ]);
        setIsTyping(false);
      }, 800);
    }
  };

  // Handle Birthdate selection
  const handleBirthdateSubmit = (bdValue: string) => {
    if (!bdValue) return;
    setBirthdate(bdValue);

    const dateObj = new Date(bdValue);
    const formattedDate = dateObj.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    setMessages((prev) => [...prev, { id: `user-bd-${Date.now()}`, sender: "user", text: formattedDate }]);
    setCurrentStage("phone");
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-ph-${Date.now()}`,
          sender: "ai",
          text: `Almost done! Can you provide your Mobile Number? (optional, enter to help us verify your account, or click Skip below)`,
        },
      ]);
      setIsTyping(false);
    }, 800);
  };

  // Handle Mobile Number submission
  const handlePhoneSubmit = async (phoneValue: string, isSkipped = false) => {
    const cleanPhone = isSkipped ? "" : phoneValue.trim();
    setPhone(cleanPhone);

    setMessages((prev) => [
      ...prev,
      {
        id: `user-ph-${Date.now()}`,
        sender: "user",
        text: isSkipped ? "Skip mobile number" : cleanPhone,
      },
    ]);

    setCurrentStage("searching");
    setIsTyping(true);

    try {
      const res = await fetch("/api/auth/retrieve-account/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          birthdate: birthdate,
          phone: cleanPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");

      const found = data.accounts || [];
      setAccounts(found);

      if (found.length === 0) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-not-found-${Date.now()}`,
              sender: "ai",
              text: "⚠️ No matching accounts found. Please double-check your spelling and birthday.",
              component: (
                <button onClick={handleRestart} style={smallButtonStyle}>
                  🔄 Start Search Again
                </button>
              ),
            },
          ]);
          setIsTyping(false);
        }, 1200);
      } else if (found.length === 1) {
        const selected = found[0];
        setSelectedAccount(selected);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-found-single-${Date.now()}`,
              sender: "ai",
              text: `I found a matching profile: **${selected.firstName} ${selected.lastName}**.`,
            },
          ]);
          setIsTyping(true);

          setTimeout(() => {
            const hasPhone = !!selected.phone;
            if (hasPhone) {
              const maskedPhone = `${selected.phone.slice(0, 4)}*******${selected.phone.slice(-3)}`;
              setMessages((prev) => [
                ...prev,
                {
                  id: `ai-otp-ready-${Date.now()}`,
                  sender: "ai",
                  text: `To secure your account, we need to send a 6-digit verification code (OTP) to your registered number: ${maskedPhone}.`,
                  component: (
                    <button onClick={() => handleSendOtp(selected)} style={smallButtonStyle}>
                      ✉️ Send OTP Code
                    </button>
                  ),
                },
              ]);
              setCurrentStage("send_otp");
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  id: `ai-no-phone-${Date.now()}`,
                  sender: "ai",
                  text: `⚠️ This profile does not have a registered mobile number. We cannot send an OTP code for verification. Please contact your church administrator to manually recover this account.`,
                  component: (
                    <button onClick={handleRestart} style={smallButtonStyle}>
                      🔄 Start Search Again
                    </button>
                  ),
                },
              ]);
              setCurrentStage("searching");
            }
            setIsTyping(false);
          }, 800);
        }, 1200);
      } else {
        // Multiple matches, let user select
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-multiple-${Date.now()}`,
              sender: "ai",
              text: "I found multiple matching accounts. Please select which one represents your actual profile:",
              component: (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                  {found.map((acc: MatchedAccount) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      style={cardStyle}
                      className="account-select-card"
                    >
                      <div style={avatarCircleStyle}>
                        {acc.profilePicture ? (
                          <img
                            src={acc.profilePicture}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            alt=""
                          />
                        ) : (
                          `${acc.firstName[0]}${acc.lastName[0]}`.toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>
                          {acc.firstName} {acc.lastName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.1rem" }}>
                          Username: {acc.username ? `${acc.username.slice(0, 2)}***` : "Not set"} · Mobile:{" "}
                          {acc.phone ? `${acc.phone.slice(0, 4)}***${acc.phone.slice(-3)}` : "None"}
                        </div>
                      </div>
                      <span style={{ fontSize: "1.1rem", color: PRIMARY }}>➔</span>
                    </div>
                  ))}
                  <button onClick={handleRestart} style={secondarySmallButtonStyle}>
                    🔄 Search Again
                  </button>
                </div>
              ),
            },
          ]);
          setCurrentStage("select");
          setIsTyping(false);
        }, 1200);
      }
    } catch (err: any) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-search-err-${Date.now()}`,
            sender: "ai",
            text: `⚠️ An error occurred while searching: ${err.message || "Please try again."}`,
            component: (
              <button onClick={handleRestart} style={smallButtonStyle}>
                🔄 Start Search Again
              </button>
            ),
          },
        ]);
        setIsTyping(false);
      }, 1000);
    }
  };

  // Handle selecting one profile from multiple matching accounts
  const handleSelectAccount = (account: MatchedAccount) => {
    setSelectedAccount(account);
    setMessages((prev) => [
      ...prev,
      {
        id: `user-select-${Date.now()}`,
        sender: "user",
        text: `I select: ${account.firstName} ${account.lastName} (Username: ${
          account.username ? account.username.slice(0, 2) + "***" : "Not set"
        })`,
      },
    ]);

    setIsTyping(true);
    setTimeout(() => {
      const hasPhone = !!account.phone;
      if (hasPhone) {
        const maskedPhone = `${account.phone.slice(0, 4)}*******${account.phone.slice(-3)}`;
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-otp-ready-${Date.now()}`,
            sender: "ai",
            text: `To secure your account, we need to send a 6-digit verification code (OTP) to your registered number: ${maskedPhone}.`,
            component: (
              <button onClick={() => handleSendOtp(account)} style={smallButtonStyle}>
                ✉️ Send OTP Code
              </button>
            ),
          },
        ]);
        setCurrentStage("send_otp");
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-no-phone-${Date.now()}`,
            sender: "ai",
            text: `⚠️ This profile does not have a registered mobile number. We cannot send an OTP code for verification. Please contact your church administrator to manually recover this account.`,
            component: (
              <button onClick={handleRestart} style={smallButtonStyle}>
                🔄 Start Search Again
              </button>
            ),
          },
        ]);
        setCurrentStage("searching");
      }
      setIsTyping(false);
    }, 800);
  };

  // Trigger OTP sending
  const handleSendOtp = async (account: MatchedAccount) => {
    setError("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/auth/retrieve-account/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: account.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP.");

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-otp-sent-${Date.now()}`,
          sender: "ai",
          text: `✉️ Verification code has been sent! Please enter the 6-digit OTP code below.`,
        },
      ]);
      setCurrentStage("verify_otp");
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-otp-err-${Date.now()}`,
          sender: "ai",
          text: `⚠️ Could not send OTP code: ${err.message || "Please verify your mobile number."}`,
          component: (
            <button onClick={() => handleSendOtp(account)} style={smallButtonStyle}>
              ✉️ Retry Send OTP
            </button>
          ),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Submit OTP & Merge & Auto-login
  const handleVerifyOtpSubmit = async (code: string) => {
    if (!selectedAccount) return;
    setIsTyping(true);

    try {
      const duplicateIds = accounts.filter((acc) => acc.id !== selectedAccount.id).map((acc) => acc.id);

      const res = await fetch("/api/auth/retrieve-account/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedAccount.id,
          otpCode: code,
          duplicateIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");

      const username = data.username || selectedAccount.username;
      setRecoveredUsername(username);

      // Auto-login after successful merge
      const loginRes = await signIn("credentials", {
        memberId: String(selectedAccount.id),
        otpVerified: "true",
        redirect: false,
      });

      if (loginRes?.error) {
        throw new Error("Reset succeeded, but automatic login failed. Please sign in manually.");
      }

      sessionStorage.setItem("hgf-just-logged-in", "1");

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-verify-success-${Date.now()}`,
          sender: "ai",
          text: `🎉 Success! Your account has been verified. Any duplicate profiles under your name have been merged (posts, comments, listings, etc.).`,
          component: (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
              <div style={recoveredCardStyle}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  Your Username
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "0.15rem 0 0.5rem" }}>
                  {username}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  Temporary Password Set
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#10b981", margin: "0.15rem 0" }}>
                  Godisgood
                </div>
              </div>

              <Link
                href="/profile/edit?tab=security"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.85rem",
                  background: PRIMARY,
                  color: "white",
                  borderRadius: "8px",
                  fontWeight: 700,
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  textAlign: "center",
                  boxSizing: "border-box",
                  boxShadow: "0 4px 12px rgba(78, 177, 203, 0.3)",
                }}
              >
                🔒 Change Password Now
              </Link>
            </div>
          ),
        },
      ]);
      setCurrentStage("success");
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-verify-err-${Date.now()}`,
          sender: "ai",
          text: `⚠️ Verification failed: ${err.message || "Invalid OTP code. Please try again."}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Restart recovery search
  const handleRestart = () => {
    setFirstName("");
    setLastName("");
    setBirthdate("");
    setPhone("");
    setOtpCode("");
    setAccounts([]);
    setSelectedAccount(null);
    setRecoveredUsername("");
    setError("");

    setIsTyping(true);
    setMessages([
      {
        id: `restart-${Date.now()}`,
        sender: "ai",
        text: "Let's try that again. What is your First Name?",
      },
    ]);
    setCurrentStage("first_name");
    setIsTyping(false);
  };

  // Renders the interactive input components based on active recovery stage
  const renderInputArea = () => {
    if (
      currentStage === "searching" ||
      currentStage === "select" ||
      currentStage === "send_otp" ||
      currentStage === "success"
    ) {
      return (
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "#64748b",
          }}
        >
          {currentStage === "searching" && "Searching profiles..."}
          {currentStage === "select" && "Please select your profile above."}
          {currentStage === "send_otp" && "Click the 'Send OTP' button in the chat."}
          {currentStage === "success" && "Recovery process completed successfully!"}
        </div>
      );
    }

    if (currentStage === "birthdate") {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = (e.currentTarget.elements.namedItem("birthdate") as HTMLInputElement).value;
            if (val) handleBirthdateSubmit(val);
          }}
          style={inputFormStyle}
        >
          <input
            name="birthdate"
            type="date"
            required
            max={new Date().toISOString().split("T")[0]}
            style={{ ...inputFieldStyle, padding: "0.6rem 0.8rem" }}
          />
          <button type="submit" style={sendButtonStyle}>
            Send
          </button>
        </form>
      );
    }

    if (currentStage === "phone") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "1rem 1.5rem",
            background: "white",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = (e.currentTarget.elements.namedItem("phone") as HTMLInputElement).value;
              handlePhoneSubmit(val);
            }}
            style={{ display: "flex", gap: "0.5rem", width: "100%" }}
          >
            <input
              name="phone"
              type="tel"
              placeholder="e.g. 09171234567"
              required
              style={inputFieldStyle}
            />
            <button type="submit" style={sendButtonStyle}>
              Send
            </button>
          </form>
          <button type="button" onClick={() => handlePhoneSubmit("", true)} style={skipButtonStyle}>
            Skip Mobile Number
          </button>
        </div>
      );
    }

    if (currentStage === "verify_otp") {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = (e.currentTarget.elements.namedItem("otp") as HTMLInputElement).value;
            if (val.length === 6) handleVerifyOtpSubmit(val);
          }}
          style={inputFormStyle}
        >
          <input
            name="otp"
            type="text"
            pattern="\d{6}"
            maxLength={6}
            placeholder="6-Digit OTP Code"
            required
            onChange={(e) => (e.target.value = e.target.value.replace(/\D/g, ""))}
            style={{
              ...inputFieldStyle,
              textAlign: "center",
              letterSpacing: "0.25rem",
              fontWeight: 800,
              fontSize: "1.1rem",
            }}
          />
          <button type="submit" style={sendButtonStyle}>
            Verify
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleSendText} style={inputFormStyle}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            currentStage === "first_name" ? "Enter your First Name..." : "Enter your Last Name..."
          }
          required
          autoComplete="off"
          style={inputFieldStyle}
        />
        <button type="submit" style={sendButtonStyle}>
          Send
        </button>
      </form>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 50%, #1f6477 100%)",
        padding: "1.5rem",
      }}
    >
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          background-color: #64748b;
          border-radius: 50%;
          animation: bounce 1s infinite ease-in-out;
        }
        .account-select-card {
          border: 1.5px solid #e2e8f0;
          background: white;
        }
        .account-select-card:hover {
          border-color: ${PRIMARY} !important;
          background: #f0fdfa !important;
        }
      `}</style>

      <div
        style={{
          background: "white",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "480px",
          height: "640px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Assistant Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#ecfeff",
              border: `2px solid ${PRIMARY}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
            }}
          >
            🤖
          </div>
          <div>
            <h1 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Grace AI Helper
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}>
              HGF Connect Account Recovery
            </p>
          </div>
        </div>

        {/* Chat Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            background: "#f8fafc",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.map((msg) => {
            const isAi = msg.sender === "ai";
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isAi ? "flex-start" : "flex-end",
                  marginBottom: "1rem",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", maxWidth: "85%" }}>
                  {isAi && (
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "#ecfeff",
                        border: `1.5px solid ${PRIMARY}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.95rem",
                        flexShrink: 0,
                        marginTop: "12px",
                      }}
                    >
                      🤖
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "100%" }}>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: "#94a3b8",
                        alignSelf: isAi ? "flex-start" : "flex-end",
                        margin: "0 4px",
                      }}
                    >
                      {isAi ? "Grace" : "You"}
                    </span>
                    <div
                      style={{
                        background: isAi ? "white" : `linear-gradient(135deg, ${PRIMARY} 0%, #3a95ad 100%)`,
                        color: isAi ? "#1e293b" : "white",
                        padding: "0.75rem 1rem",
                        borderRadius: isAi ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
                        fontSize: "0.875rem",
                        lineHeight: 1.45,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        border: isAi ? "1px solid #e2e8f0" : "none",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.text}
                    </div>
                    {msg.component && (
                      <div style={{ marginTop: "0.35rem", alignSelf: "stretch" }}>
                        {msg.component}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator bubble */}
          {isTyping && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
                marginBottom: "1rem",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#ecfeff",
                  border: `1.5px solid ${PRIMARY}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                  flexShrink: 0,
                  marginTop: "12px",
                }}
              >
                🤖
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.6875rem", color: "#94a3b8", margin: "0 4px" }}>
                  Grace is typing
                </span>
                <div
                  style={{
                    background: "white",
                    padding: "0.75rem 1rem",
                    borderRadius: "18px 18px 18px 4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    width: "fit-content",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div className="typing-dot" style={{ animationDelay: "0s" }} />
                  <div className="typing-dot" style={{ animationDelay: "0.2s" }} />
                  <div className="typing-dot" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Footer Input Area */}
        {renderInputArea()}

        {/* Footer return to login */}
        {currentStage !== "success" && (
          <div
            style={{
              padding: "0.85rem 1.5rem",
              background: "#fafafa",
              borderTop: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <Link
              href="/login"
              style={{
                color: "#94a3b8",
                fontSize: "0.8125rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              ← Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Styling Constants
const smallButtonStyle: React.CSSProperties = {
  background: PRIMARY,
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "0.6rem 1.2rem",
  fontWeight: 700,
  fontSize: "0.85rem",
  cursor: "pointer",
  marginTop: "0.5rem",
  transition: "opacity 0.15s",
  boxShadow: "0 2px 6px rgba(78, 177, 203, 0.2)",
};

const secondarySmallButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1.5px solid #cbd5e1",
  color: "#64748b",
  borderRadius: "8px",
  padding: "0.6rem 1.2rem",
  fontWeight: 700,
  fontSize: "0.85rem",
  cursor: "pointer",
  marginTop: "0.25rem",
  transition: "all 0.15s",
};

const cardStyle: React.CSSProperties = {
  padding: "0.85rem",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "all 0.15s",
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const avatarCircleStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: `${PRIMARY}20`,
  color: PRIMARY,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.85rem",
  overflow: "hidden",
};

const recoveredCardStyle: React.CSSProperties = {
  background: "#ecfeff",
  border: `1px solid ${PRIMARY}30`,
  borderRadius: "12px",
  padding: "1rem",
  textAlign: "center",
};

const inputFormStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  padding: "1rem 1.5rem",
  background: "white",
  borderTop: "1px solid #e2e8f0",
  width: "100%",
  boxSizing: "border-box",
};

const inputFieldStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.75rem 1rem",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
};

const sendButtonStyle: React.CSSProperties = {
  background: PRIMARY,
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "0.75rem 1.25rem",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(78, 177, 203, 0.2)",
};

const skipButtonStyle: React.CSSProperties = {
  background: "#f1f5f9",
  color: "#475569",
  border: "none",
  borderRadius: "8px",
  padding: "0.5rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
  width: "100%",
};
