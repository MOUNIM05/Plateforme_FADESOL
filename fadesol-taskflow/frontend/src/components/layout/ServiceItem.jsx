function ServiceItem({ service, active, onSelect }) {
  return (
    <button
      type="button"
      className={`service-item ${active ? "service-item--active" : ""}`}
      onClick={() => onSelect(service)}
    >
      <span className={`service-item__icon service-item__icon--${service.color}`}>
        {service.initial}
      </span>
      <span className="service-item__content">
        <strong>{service.name}</strong>
        {service.subtitle && <small>{service.subtitle}</small>}
      </span>
    </button>
  );
}

export default ServiceItem;
