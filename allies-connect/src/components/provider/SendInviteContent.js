import { useState } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { API_URL } from "./providerHelpers";

function SendInviteContent({ providerId, userId }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSend = async () => {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`${API_URL}/api/organizations/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(userId),
        },
        body: JSON.stringify({
          email,
          username: username || undefined,
          provider_id: providerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send invitation.");
        return;
      }

      setSuccess(`Invitation sent successfully to ${email}!`);
      setEmail("");
      setUsername("");
    } catch (err) {
      console.error("Error sending invite:", err);
      setError("An error occurred while sending the invitation.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="mb-3">
        Send an invitation email to add a new member to your organization.
      </p>

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Row className="text-start mb-3">
        <Col md={3} className="d-flex align-items-center">
          <h6>
            Email: <span className="text-danger">*</span>
          </h6>
        </Col>
        <Col>
          <Form.Control
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            isInvalid={email && !isValidEmail(email)}
          />
          <Form.Control.Feedback type="invalid">
            Please enter a valid email address
          </Form.Control.Feedback>
        </Col>
      </Row>

      <Row className="text-start mb-3">
        <Col md={3} className="d-flex align-items-center">
          <h6>Username:</h6>
        </Col>
        <Col>
          <Form.Control
            type="text"
            placeholder="Suggest a username (optional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Form.Text className="text-muted">
            Optional — the invitee can change this when they register.
          </Form.Text>
        </Col>
      </Row>

      <div className="d-flex justify-content-end mt-3">
        <Button
          className="btn-gold"
          onClick={handleSend}
          disabled={sending || !email || !isValidEmail(email)}
          style={{
            opacity: sending || !email || !isValidEmail(email) ? 0.5 : 1,
          }}
        >
          {sending ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Sending...
            </>
          ) : (
            "Send Invite"
          )}
        </Button>
      </div>
    </div>
  );
}

export default SendInviteContent;
