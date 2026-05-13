import { Modal } from "react-bootstrap";
import "../App.css";

function SubscribedOrgsContent({ data }) {
  return (
    <>
      <p>
        <strong>Organization:</strong> {data?.name || "N/A"}
      </p>
      <p>
        <strong>Email:</strong> {data?.email || "N/A"}
      </p>
      <p>
        <strong>Phone:</strong> {data?.phone || "N/A"}
      </p>
      <p>
        <strong>Description:</strong> {data?.description || "N/A"}
      </p>
    </>
  );
}

function AvailabilityContent({ data }) {
  return (
    <>
      <p>
        <strong>Day:</strong> {data?.day || "N/A"}
      </p>
      <p>
        <strong>Start Time:</strong> {data?.start_time || "N/A"}
      </p>
      <p>
        <strong>End Time:</strong> {data?.end_time || "N/A"}
      </p>
    </>
  );
}

function ContactInfoContent({ data }) {
  return (
    <>
      <p>
        <strong>Name:</strong> {data?.name || "N/A"}
      </p>
      <p>
        <strong>Email:</strong> {data?.email || "N/A"}
      </p>
      <p>
        <strong>Phone:</strong> {data?.phone || "N/A"}
      </p>
      <p>
        <strong>Address:</strong> {data?.address || "N/A"}
      </p>
    </>
  );
}

function SignupDetailsContent({ data }) {
  return (
    <>
      <p>
        <strong>Event:</strong> {data?.title || data?.event_name || "N/A"}
      </p>
      <p>
        <strong>Date:</strong> {data?.event_date || "N/A"}
      </p>
      <p>
        <strong>Location:</strong> {data?.location || "N/A"}
      </p>
      <p>
        <strong>Status:</strong> {data?.status || "N/A"}
      </p>
    </>
  );
}

function ShiftDetailsContent({ data }) {
  return (
    <>
      <p>
        <strong>Event:</strong> {data?.event_name || data?.title || "N/A"}
      </p>
      <p>
        <strong>Date:</strong> {data?.shift_date || data?.event_date || "N/A"}
      </p>
      <p>
        <strong>Start Time:</strong> {data?.start_time || "N/A"}
      </p>
      <p>
        <strong>End Time:</strong> {data?.end_time || "N/A"}
      </p>
      <p>
        <strong>Role:</strong> {data?.role || "N/A"}
      </p>
    </>
  );
}

function ExportHoursContent({ data }) {
  return (
    <>
      <p>
        <strong>Event:</strong> {data?.event_name || data?.title || "N/A"}
      </p>
      <p>
        <strong>Date:</strong> {data?.event_date || "N/A"}
      </p>
      <p>
        <strong>Hours:</strong> {data?.hours || "N/A"}
      </p>
      <p>
        <strong>Status:</strong> {data?.status || "N/A"}
      </p>
    </>
  );
}

const MODAL_TYPE = {
  subscribedOrgs: {
    title: "Organization Details",
    Content: SubscribedOrgsContent,
  },
  editAvailability: {
    title: "Availability Details",
    Content: AvailabilityContent,
  },
  contactInfo: {
    title: "Contact Information Details",
    Content: ContactInfoContent,
  },
  reviewSignups: {
    title: "Signup Details",
    Content: SignupDetailsContent,
  },
  viewShifts: {
    title: "Shift Details",
    Content: ShiftDetailsContent,
  },
  exportHours: {
    title: "Volunteer Hours Details",
    Content: ExportHoursContent,
  },
};

function VolunteerDetailsModal({ show, onHide, type, data }) {
  const config = MODAL_TYPE[type];

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{config?.title || ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{config && <config.Content data={data} />}</Modal.Body>
    </Modal>
  );
}

export default VolunteerDetailsModal;
