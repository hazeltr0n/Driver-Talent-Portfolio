import { useState, useEffect } from "react";
import { getCandidate, updateCandidate } from "./lib/api";

export default function DriverStoryForm({ uuid }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("preferences"); // preferences, choice, complete

  const [form, setForm] = useState({
    zipcode: "",
    home_time_preference: "",
    shift_preference: "",
    willing_overtime: "",
    max_commute_miles: "",
    min_weekly_pay: "",
    target_weekly_pay: "",
    willing_touch_freight: "",
  });

  useEffect(() => {
    if (!uuid) {
      setError("No form ID provided");
      setLoading(false);
      return;
    }

    getCandidate(uuid)
      .then((data) => {
        setDriver({ id: data.id, fields: data });
        setForm({
          zipcode: data.zipcode?.toString() || data.zipcodeFromApplication?.toString() || "",
          home_time_preference: data.home_time_preference || "",
          shift_preference: data.shift_preference || "",
          willing_overtime: data.willing_overtime || "",
          max_commute_miles: data.max_commute_miles || "",
          min_weekly_pay: data.min_weekly_pay?.toString() || "",
          target_weekly_pay: data.target_weekly_pay?.toString() || "",
          willing_touch_freight: data.willing_touch_freight || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [uuid]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const fields = {
        ...form,
        min_weekly_pay: form.min_weekly_pay ? parseInt(form.min_weekly_pay) : null,
        target_weekly_pay: form.target_weekly_pay ? parseInt(form.target_weekly_pay) : null,
      };
      await updateCandidate(uuid, fields);
      setStep("choice");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordVideo = () => {
    window.location.href = `/record/${uuid}`;
  };

  const handleSkipVideo = () => {
    setStep("complete");
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={styles.logo} />
          <p style={{ color: "#5A7A82" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !driver) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={styles.logo} />
          <h1 style={styles.title}>Form Not Found</h1>
          <p style={{ color: "#5A7A82" }}>This form link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const firstName = driver?.fields?.fullName?.split(" ")[0] || "Driver";

  // Choice Screen - after preferences saved
  if (step === "choice") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={styles.logo} />
          <h1 style={styles.title}>Preferences Saved!</h1>
          <p style={styles.subtitle}>
            Now let's make your profile stand out. Record a short video introducing yourself to employers.
          </p>

          <div style={styles.choiceButtons}>
            <button onClick={handleRecordVideo} style={styles.primaryButton}>
              Record My Story Video
            </button>
            <button onClick={handleSkipVideo} style={styles.secondaryButton}>
              I'll do this later
            </button>
          </div>

          <p style={styles.tipText}>
            The video takes about 5 minutes and helps employers see the real you.
          </p>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (step === "complete") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 style={styles.title}>You're All Set!</h1>
          <p style={styles.subtitle}>
            Your preferences have been saved. Your Career Agent will use this to find the best job matches for you.
          </p>

          <div style={styles.nextSteps}>
            <h3 style={styles.nextStepsTitle}>What's Next?</h3>
            <ul style={styles.nextStepsList}>
              <li>Your Career Agent will review your profile</li>
              <li>We'll match you with jobs that fit your preferences</li>
              <li>You'll hear from us when we find a great opportunity</li>
            </ul>
          </div>

          <button
            onClick={() => window.location.href = `/record/${uuid}`}
            style={styles.secondaryButton}
          >
            Record Video Story (Optional)
          </button>
        </div>
      </div>
    );
  }

  // Preferences Form
  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.header}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={styles.logo} />
          <h1 style={styles.title}>Welcome, {firstName}!</h1>
          <p style={styles.subtitle}>
            Tell us about your job preferences so we can find the best matches for you.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Section title="Your Preferences">
            <Input
              label="Your Zip Code"
              placeholder="e.g. 75001"
              value={form.zipcode}
              onChange={(v) => handleChange("zipcode", v)}
            />
            <Select
              label="Home time preference"
              value={form.home_time_preference}
              onChange={(v) => handleChange("home_time_preference", v)}
              options={["", "Daily", "Weekly", "OTR", "Flexible"]}
            />
            <Select
              label="Shift preference"
              value={form.shift_preference}
              onChange={(v) => handleChange("shift_preference", v)}
              options={["", "Days", "Nights", "No Preference"]}
            />
            <Select
              label="Willing to work overtime?"
              value={form.willing_overtime}
              onChange={(v) => handleChange("willing_overtime", v)}
              options={["", "Yes", "Sometimes", "No"]}
            />
            <Select
              label="How far are you willing to commute?"
              value={form.max_commute_miles}
              onChange={(v) => handleChange("max_commute_miles", v)}
              options={["", "25 miles", "50 miles", "75 miles", "100+ miles"]}
            />
            <Select
              label="Willing to handle touch freight?"
              value={form.willing_touch_freight}
              onChange={(v) => handleChange("willing_touch_freight", v)}
              options={["", "Very Light (No-Touch Freight)", "Light (Pallet Jack)", "Medium (Dolly/Liftgate)", "Heavy (Very Physical Work)"]}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Input
                label="Minimum weekly pay ($)"
                placeholder="e.g. 1200"
                type="number"
                value={form.min_weekly_pay}
                onChange={(v) => handleChange("min_weekly_pay", v)}
              />
              <Input
                label="Target weekly pay ($)"
                placeholder="e.g. 1500"
                type="number"
                value={form.target_weekly_pay}
                onChange={(v) => handleChange("target_weekly_pay", v)}
              />
            </div>
          </Section>

          {error && (
            <div style={styles.error}>{error}</div>
          )}

          <button type="submit" disabled={saving} style={styles.submitButton}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
    </div>
  );
}

function Input({ label, placeholder, type = "text", value, onChange }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <select
        style={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || "Select..."}
          </option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#F4F4F4",
    padding: "20px 16px",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  card: {
    maxWidth: 500,
    margin: "40px auto",
    background: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  formCard: {
    maxWidth: 640,
    margin: "0 auto",
    background: "#FFFFFF",
    borderRadius: 12,
    padding: "32px 24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: "1px solid #E8ECEE",
  },
  logo: {
    height: 48,
    width: 48,
    marginBottom: 16,
  },
  title: {
    margin: "0 0 8px",
    fontSize: 24,
    fontWeight: 700,
    color: "#004751",
    fontFamily: "Georgia, serif",
  },
  subtitle: {
    margin: 0,
    fontSize: 15,
    color: "#5A7A82",
    lineHeight: 1.5,
  },
  sectionTitle: {
    margin: "0 0 16px",
    fontSize: 18,
    fontWeight: 700,
    color: "#004751",
    fontFamily: "Georgia, serif",
    paddingBottom: 8,
    borderBottom: "2px solid #004751",
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
    color: "#1A2A30",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    border: "1px solid #D1D9DD",
    borderRadius: 8,
    background: "#FAFBFB",
    color: "#1A2A30",
    boxSizing: "border-box",
  },
  submitButton: {
    width: "100%",
    padding: "14px 24px",
    fontSize: 16,
    fontWeight: 700,
    color: "#191931",
    background: "#CDF95C",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 8,
  },
  primaryButton: {
    width: "100%",
    padding: "16px 24px",
    fontSize: 16,
    fontWeight: 700,
    color: "#191931",
    background: "#CDF95C",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginBottom: 12,
  },
  secondaryButton: {
    width: "100%",
    padding: "14px 24px",
    fontSize: 15,
    fontWeight: 600,
    color: "#004751",
    background: "#FFFFFF",
    border: "2px solid #004751",
    borderRadius: 8,
    cursor: "pointer",
  },
  choiceButtons: {
    marginTop: 24,
    marginBottom: 16,
  },
  tipText: {
    fontSize: 13,
    color: "#5A7A82",
    marginTop: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "#D1FAE5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  nextSteps: {
    background: "#F8FAFB",
    borderRadius: 8,
    padding: 20,
    marginTop: 24,
    marginBottom: 24,
    textAlign: "left",
  },
  nextStepsTitle: {
    margin: "0 0 12px",
    fontSize: 16,
    fontWeight: 700,
    color: "#004751",
  },
  nextStepsList: {
    margin: 0,
    paddingLeft: 20,
    color: "#3A5A64",
    lineHeight: 1.8,
  },
  error: {
    background: "#FFF0F0",
    color: "#C53030",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
};
