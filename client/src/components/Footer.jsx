import { Link } from 'react-router-dom'
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">Summer<span>Fits</span></div>
          <p>Zomerse stijl voor elke dag. Kwaliteitskleding voor heren, dames en kids.</p>
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
            <li><a href="mailto:info@summerfits.nl">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SummerFits</span>
        <span>Gemaakt met ❤️ in Nederland</span>
      </div>
    </footer>
  )
}
