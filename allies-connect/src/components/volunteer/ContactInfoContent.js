import { useEffect, useState } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { API_URL } from "./volunteerHelpers";

function ContactInfoContent({ userId }) {
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    zip_code: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          zip_code: data.zip_code || "",
          email: data.email || "",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value) => {
    // Strip non-digits
    const digits = value.replace(/\D/g, "").slice(0, 10);
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (value) => {
    handleChange("phone", value.replace(/\D/g, "").slice(0, 10));
  };

  const handleSave = async () => {
    setMsg(null);

    // Validation
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setMsg({ type: "danger", text: "First and last name are required." });
      return;
    }

    const phoneDigits = profile.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setMsg({ type: "danger", text: "Phone number must be 10 digits." });
      return;
    }

    if (!profile.zip_code.trim()) {
      setMsg({ type: "danger", text: "Zip code is required." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/users/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          phone: phoneDigits,
          zip_code: profile.zip_code.trim(),
        }),
      });

      if (res.ok) {
        // Also update localStorage so the navbar / other components stay in sync
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.first_name = profile.first_name.trim();
          user.last_name = profile.last_name.trim();
          user.phone = phoneDigits;
          user.zip_code = profile.zip_code.trim();
          localStorage.setItem("user", JSON.stringify(user));
        }
        setMsg({ type: "success", text: "Contact info updated!" });
      } else {
        const err = await res.json();
        setMsg({ type: "danger", text: err.error || "Failed to save." });
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setMsg({ type: "danger", text: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Loading…
      </div>
    );
  }

  return (
    <>
      {/* Email (read-only) */}
      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control type="email" value={profile.email} disabled />
        <Form.Text className="text-muted">
          Email cannot be changed here.
        </Form.Text>
      </Form.Group>

      <Row className="g-3 mb-3">
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>First Name</Form.Label>
            <Form.Control
              type="text"
              value={profile.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
              placeholder="First name"
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Last Name</Form.Label>
            <Form.Control
              type="text"
              value={profile.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
              placeholder="Last name"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              type="tel"
              value={formatPhone(profile.phone)}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Zip Code</Form.Label>
            <Form.Control
              type="text"
              value={profile.zip_code}
              onChange={(e) =>
                handleChange(
                  "zip_code",
                  e.target.value.replace(/\D/g, "").slice(0, 10),
                )
              }
              placeholder="Zip code"
            />
          </Form.Group>
        </Col>
      </Row>

      {msg && (
        <Alert variant={msg.type} dismissible onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      <div className="d-flex justify-content-end">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}

export default ContactInfoContent;
