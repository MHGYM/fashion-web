import { useNavigate } from 'react-router-dom'
export default function ProductCard({ product }) {
  const navigate = useNavigate()
  const hasSale = product.sale_price && product.sale_price < product.price
  return (
    <div className="product-card" onClick={() => navigate(`/shop/${product.slug}`)}>
      <div className="product-card-img">
        {product.image
          ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
          : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#f0ede8,#e8e4de)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem' }} aria-hidden="true">👕</div>
        }
        {product.featured && !hasSale && <span className="product-card-badge">Nieuw</span>}
        {hasSale && <span className="product-card-badge sale">Sale</span>}
      </div>
      <div className="product-card-body">
        <div className="product-card-name">{product.name}</div>
        <div className="product-card-cat">{product.category_name}</div>
        <div className="product-card-price">
          {hasSale ? (
            <>
              <span className="price price-sale">€{Number(product.sale_price).toFixed(2)}</span>
              <span className="price-old">€{Number(product.price).toFixed(2)}</span>
            </>
          ) : (
            <span className="price">€{Number(product.price).toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
