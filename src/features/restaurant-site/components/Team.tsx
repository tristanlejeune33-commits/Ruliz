import type { TeamMember } from "../types";

interface TeamProps {
  members: TeamMember[];
}

/**
 * Section "Notre équipe" — chef + serveurs + sommelier, etc.
 * Photo ronde + nom + rôle + bio optionnelle.
 */
export function Team({ members }: TeamProps) {
  if (!members.length) return null;

  return (
    <section id="team" className="rs-section">
      <div className="rs-container">
        <div className="rs-section__head">
          <p className="rs-eyebrow">L&apos;équipe</p>
          <h2 className="rs-display rs-section__title">Qui nous sommes</h2>
        </div>

        <div className="rs-team__grid">
          {members.map((m, i) => (
            <article key={`${m.name}-${i}`} className="rs-team__card">
              <div className="rs-team__avatar">
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt={m.name} />
                ) : (
                  <div className="rs-team__avatar--fallback">
                    {m.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="rs-team__name">{m.name}</h3>
              <p className="rs-team__role">{m.role}</p>
              {m.bio && <p className="rs-team__bio">{m.bio}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
