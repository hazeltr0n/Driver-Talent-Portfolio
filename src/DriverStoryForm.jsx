import { useState, useEffect } from "react";
import { getCandidate, updateCandidate } from "./lib/api";

export default function DriverStoryForm({ uuid }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    story_who_are_you: "",
    story_what_is_your_why: "",
    story_freeworld_journey: "",
    story_why_trucking: "",
    story_looking_for: "",
    story_what_others_say: "",
    zipcode: "",
    home_time_preference: "",
    shift_preference: "",
    willing_overtime: "",
    max_commute_miles: "",
    min_weekly_pay: "",
    target_weekly_pay: "",
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
          story_who_are_you: data.story_who_are_you || "",
          story_what_is_your_why: data.story_what_is_your_why || "",
          story_freeworld_journey: data.story_freeworld_journey || "",
          story_why_trucking: data.story_why_trucking || "",
          story_looking_for: data.story_looking_for || "",
          story_what_others_say: data.story_what_others_say || "",
          zipcode: data.zipcode?.toString() || data.zipcodeFromApplication?.toString() || "",
          home_time_preference: data.home_time_preference || "",
          shift_preference: data.shift_preference || "",
          willing_overtime: data.willing_overtime || "",
          max_commute_miles: data.max_commute_miles || "",
          min_weekly_pay: data.min_weekly_pay?.toString() || "",
          target_weekly_pay: data.target_weekly_pay?.toString() || "",
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
    setSaved(false);
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
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.header}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={styles.logo} />
          <h1 style={styles.title}>Tell Your Story, {firstName}</h1>
          <p style={styles.subtitle}>
            Help recruiters understand who you are beyond your resume. This information will appear on your Driver Fit Profile.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Section title="Your Story">
            <TextArea
              label="Who are you?"
              placeholder="Tell us about yourself - where you're from, your family, what matters to you..."
              value={form.story_who_are_you}
              onChange={(v) => handleChange("story_who_are_you", v)}
            />
            <TextArea
              label="What is your why?"
              placeholder="What drives you? What gets you up in the morning?"
              value={form.story_what_is_your_why}
              onChange={(v) => handleChange("story_what_is_your_why", v)}
            />
            <TextArea
              label="Your FreeWorld journey"
              placeholder="Share your story: What happened (brief & honest, 1-3 sentences on the conviction). What changed (training, counseling, growth). How you found FreeWorld and what the experience has meant for your path forward. How you'll bring value to an employer (skills, reliability, commitment)."
              value={form.story_freeworld_journey}
              onChange={(v) => handleChange("story_freeworld_journey", v)}
            />
            <TextArea
              label="Why trucking?"
              placeholder="What drew you to trucking? What do you love about it?"
              value={form.story_why_trucking}
              onChange={(v) => handleChange("story_why_trucking", v)}
            />
            <TextArea
              label="What are you looking for in an employer?"
              placeholder="What matters most - stability, pay, culture, home time? What would make a job the right fit?"
              value={form.story_looking_for}
              onChange={(v) => handleChange("story_looking_for", v)}
            />
            <TextArea
              label="What would others say about you?"
              placeholder="How would a former dispatcher, coworker, or friend describe you?"
              value={form.story_what_others_say}
              onChange={(v) => handleChange("story_what_others_say", v)}
            />
          </Section>

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
              options={["", "Daily", "Weekly", "Bi-weekly", "Flexible"]}
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

          {saved && (
            <div style={styles.success}>Your profile has been saved!</div>
          )}

          <button type="submit" disabled={saving} style={styles.submitButton}>
            {saving ? "Saving..." : "Save My Profile"}
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

function TextArea({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <textarea
        style={styles.textarea}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
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
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    border: "1px solid #D1D9DD",
    borderRadius: 8,
    background: "#FAFBFB",
    color: "#1A2A30",
    resize: "vertical",
    fontFamily: "inherit",
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
  error: {
    background: "#FFF0F0",
    color: "#C53030",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  success: {
    background: "#F0FAF0",
    color: "#2E7D32",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
};
