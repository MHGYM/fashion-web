import { Link } from 'react-router-dom'
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">
            <svg className="footer-logo-mark" viewBox="0 0 108 62" aria-hidden="true">
              <path d="M0,0 h41 v13 h-27 v11 h22 v13 h-22 v25 h-14 z"/>
              <path d="M53,0 h15 l13,26 l13,-26 h15 v62 h-14 v-35 l-11,22 h-6 l-11,-22 v35 h-14 z"/>
            </svg>
            <span className="footer-logo-text">FightMarketing</span>
          </div>
          <p>Hét merchandise-platform voor vechtsportscholen in Nederland. Officiële clubgear, per seizoen gedropt — jouw club verdient mee.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><Link to="/shop">Alle producten</Link></li>
            <li><Link to="/shop?gender=men">Heren</Link></li>
            <li><Link to="/shop?gender=women">Dames</Link></li>
            <li><Link to="/shop?sale=1">Sale</Link></li>
          </ul>
        </div>
        <div>
          <h4>Klantenservice</h4>
          <ul>
            <li><Link to="/account">Mijn bestellingen</Link></li>
            <li><Link to="/scholen">School aansluiten</Link></li>
            <li><a href="mailto:info@fightmarketing.nl">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} FightMarketing — fightmarketing.nl</span>
        <span>Gemaakt met ❤️ in Nederland</span>
      </div>
    </footer>
  )
}
