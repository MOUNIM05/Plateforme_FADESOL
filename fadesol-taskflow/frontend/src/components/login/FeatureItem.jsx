function FeatureItem({ icon, title, text }) {
  const Icon = icon;

  return (
    <article className="login-feature">
      <span className="login-feature__icon">
        {typeof Icon === "function" ? <Icon size={32} strokeWidth={1.9} /> : Icon}
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

export default FeatureItem;
