/** Products: the software portfolio, filterable by industry, plus custom solutions and an overview table. */
import { useState } from 'react';
import { usePageMeta } from './hooks/usePageMeta.js';
import { useReveal } from './hooks/useReveal.js';
import { ProductsHero, IndustryFilter, ProductRow, CustomSolutions, ProductOverview, DarkCta } from './components/products/ProductsSections.jsx';
import { COMPANY, PRODUCTS } from './utils/siteContent.js';
import { IMG } from './utils/siteImages.js';

export default function ProductsPage() {
  usePageMeta('Products', `Business software by ${COMPANY.name} for automotive, education, restaurant and retail businesses.`);
  const ref = useReveal();
  const [industry, setIndustry] = useState('all');
  const list = industry === 'all' || industry === 'custom' ? PRODUCTS : PRODUCTS.filter((p) => p.industry === industry);
  const showCustom = industry === 'all' || industry === 'custom';
  return (
    <div ref={ref}>
      <ProductsHero />
      <IndustryFilter value={industry} onChange={setIndustry} />
      <div id="portfolio" className="scroll-mt-24">
        {industry !== 'custom' && list.map((p, i) => <ProductRow key={p.id} product={p} index={i} />)}
      </div>
      {showCustom && <CustomSolutions />}
      <ProductOverview products={PRODUCTS} />
      <DarkCta image={IMG.ctaLaptopCoffee} />
    </div>
  );
}
