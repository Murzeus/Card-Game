import { Card } from './Card'; // adjust path if needed

export function PileView({ mainPile, sidePile }) {
  return (
    <div className="piles-container">
      <div className="pile main-pile">
        <h3>Main Pile</h3>
        <div className="cards">
          {mainPile.map((cardObj, index) => (
            <div 
              key={`main-${index}`}
              className={`card ${cardObj.isFixed ? 'fixed-card' : ''}`}
              title={cardObj.card}
            >
              <Card card={cardObj.card} />
            </div>
          ))}
        </div>
      </div>
      
      {sidePile.length > 0 && (
        <div className="pile side-pile">
          <h3>9s Pile</h3>
          <div className="cards">
            {sidePile.map((cardString, index) => (
              <div key={`side-${index}`} className="card" title={cardString}>
                <Card card={cardString} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}