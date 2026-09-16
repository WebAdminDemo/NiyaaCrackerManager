import { Modal } from "react-bootstrap";

const CONTACT_INFO = {
  welcome: "Welcome to our family,",
  details: "For more details",
  contact: [
    ["NCW", "+91-99622-01775"],
    ["SVA", "+81-86675-51556"],
  ],
  websites: [
    "www.niyaacrackers.com",
    "www.sreevariagency.com",
  ],
};

export { CONTACT_INFO };

const ContactInfoModal = ({ show, onHide }) => (
  <Modal show={show} onHide={onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Contact Information</Modal.Title>
    </Modal.Header>

    <Modal.Body>
      <div className="contact-info-modal">
        <p>{CONTACT_INFO.welcome}</p>
        <p>{CONTACT_INFO.details}</p>

        <strong>Contact</strong>
        <div className="mt-2 mb-3">
          {CONTACT_INFO.contact.map(([name, phone]) => (
            <div key={name} className="d-flex justify-content-between gap-3">
              <span>{name}</span>
              <strong>{phone}</strong>
            </div>
          ))}
        </div>

        <strong>Our websites</strong>
        <div className="mt-2">
          {CONTACT_INFO.websites.map((website) => (
            <div key={website}>
              <a
                href={`https://${website}`}
                target="_blank"
                rel="noreferrer"
              >
                {website}
              </a>
            </div>
          ))}
        </div>
      </div>
    </Modal.Body>
  </Modal>
);

export default ContactInfoModal;
