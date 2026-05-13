import { useState } from "react";
import { Modal } from "react-bootstrap";
import "../../App.css";
import { useModalRemountKey } from "../../hooks/useModalRemountKey";
import VolunteerDetailsModal from "../VolunteerDetailsModal";
import ContactInfoContent from "./ContactInfoContent";
import EditAvailabilityContent from "./EditAvailabilityContent";
import ExportHoursContent from "./ExportHoursContent";
import ReviewSignupsContent from "./ReviewSignupsContent";
import SubscribedOrgsContent from "./SubscribedOrgsContent";
import ViewShiftsContent from "./ViewShiftsContent";

const MODAL_TYPE = {
  subscribedOrgs: {
    title: "Manage Subscribed Organizations",
    Content: SubscribedOrgsContent,
  },
  editAvailability: {
    title: "Edit Availability",
    Content: EditAvailabilityContent,
  },
  contactInfo: {
    title: "Contact Information",
    Content: ContactInfoContent,
  },
  reviewSignups: {
    title: "Review Event Signups",
    Content: ReviewSignupsContent,
  },
  viewShifts: {
    title: "View Shifts",
    Content: ViewShiftsContent,
  },
  exportHours: {
    title: "Export Volunteer Hours",
    Content: ExportHoursContent,
  },
};

function VolunteerModal({ show, onHide, type, userId }) {
  const [detailModalType, setDetailModalType] = useState("");
  const [selectedData, setSelectedData] = useState(null);
  const config = MODAL_TYPE[type];

  // Increment a key each time the modal opens so content components remount
  // and re-fetch fresh data
  const [openKey, bumpKey] = useModalRemountKey(show);

  const handleViewDetails = (detailType, data) => {
    setSelectedData(data);
    setDetailModalType(detailType);
  };

  return (
    <Modal show={show} className="modal-wide" onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{config?.title || ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {config && (
          <config.Content
            key={openKey}
            onViewDetails={handleViewDetails}
            userId={userId}
          />
        )}
      </Modal.Body>
      <VolunteerDetailsModal
        show={!!detailModalType}
        type={detailModalType}
        data={selectedData}
        onHide={() => {
          setDetailModalType("");
          setSelectedData(null);
          bumpKey();
        }}
      />
    </Modal>
  );
}

export default VolunteerModal;
