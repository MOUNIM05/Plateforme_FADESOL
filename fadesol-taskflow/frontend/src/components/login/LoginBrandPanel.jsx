import FeatureItem from "./FeatureItem";
import QuoteCard from "./QuoteCard";
import { Leaf, ShieldCheck, UsersRound, Zap } from "lucide-react";
import fadesolLogo from "../../assets/fadesol-logo.jpg";
import heroIllustration from "../../assets/fadesol-taskflow-hero.png";

const features = [
  {
    icon: Zap,
    title: "Performance",
    text: "Optimiser chaque action",
  },
  {
    icon: UsersRound,
    title: "Collaboration",
    text: "Travailler ensemble",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité",
    text: "Données protégées",
  },
  {
    icon: Leaf,
    title: "Durabilité",
    text: "Energie responsable",
  },
];

function LoginBrandPanel() {
  return (
    <section className="login-brand-panel">
      <img className="login-brand-panel__bg" src={heroIllustration} alt="" />
      <div className="login-brand-panel__glow login-brand-panel__glow--one" />
      <div className="login-brand-panel__glow login-brand-panel__glow--two" />
      <div className="energy-lines" />

      <header className="brand-logo">
        <img src={fadesolLogo} alt="Fadesol Power Solutions" />
        <div className="brand-logo__text">
          <strong>FADESOL</strong>
          <small>Power Solutions</small>
        </div>
      </header>

      <div className="brand-copy">
        <p className="brand-copy__eyebrow">Bienvenue sur</p>
        <h1>
          Fadesol
          <span>TaskFlow</span>
        </h1>
        <div className="brand-copy__line" />
        <p>
          La plateforme interne qui centralise l’organisation, le suivi des
          tâches et la collaboration entre les services Fadesol.
        </p>
      </div>

      <div className="login-features">
        {features.map((feature) => (
          <FeatureItem key={feature.title} {...feature} />
        ))}
      </div>

      <QuoteCard />
    </section>
  );
}

export default LoginBrandPanel;
