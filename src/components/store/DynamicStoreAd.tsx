import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';

export const DynamicStoreAd = ({ placementId, onStatusChange }: { placementId: string, onStatusChange?: (isActive: boolean) => void }) => {
    const { formatPrice } = useCurrency();
    const { data: adProducts, isLoading } = useQuery({
        queryKey: ['store_ads', placementId],
        queryFn: async () => {
            // 1. Fetch active campaign for this placement
            const { data: campaign } = await (supabase as any)
                .from('store_ad_campaigns')
                .select('product_ids')
                .eq('placement_id', placementId)
                .eq('is_active', true)
                .maybeSingle();

            if (!campaign || !campaign.product_ids || campaign.product_ids.length === 0) return [];

            // 2. Fetch the actual products
            const { data: products } = await (supabase as any)
                .from('store_products')
                .select('id, title, slug, price, discount_price, images')
                .in('id', campaign.product_ids);

            // 3. Re-order products to match the array order in the campaign
            if (products) {
                return products.sort((a: any, b: any) => 
                    campaign.product_ids.indexOf(a.id) - campaign.product_ids.indexOf(b.id)
                );
            }

            return [];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes caching (zero performance impact)
    });

    useEffect(() => {
        if (!isLoading && onStatusChange) {
            onStatusChange(!!adProducts && adProducts.length > 0);
        }
    }, [adProducts, isLoading, onStatusChange]);

    if (isLoading) return null; // Or a subtle skeleton if preferred, but invisible is cleaner
    if (!adProducts || adProducts.length === 0) return null;

    return (
        <div className="w-full mt-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl p-4 md:p-5 border-2 border-indigo-100/50 dark:border-indigo-800/30">
                <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-500" /> Recommended For You
                </h3>
                
                {/* Horizontal scrolling slider to save vertical space */}
                <div className="flex overflow-x-auto gap-3 pb-2 snap-x no-scrollbar">
                    {adProducts.map(p => (
                        <a 
                            key={p.id}
                            href={`https://store.italostudy.com/${p.slug}`}
                            target="_blank" rel="noopener noreferrer"
                            className="min-w-[160px] w-[160px] snap-center bg-white dark:bg-slate-800 rounded-xl p-3 border-2 border-transparent hover:border-indigo-500 dark:hover:border-indigo-400 shadow-sm hover:shadow-xl transition-all group block shrink-0"
                        >
                            <div className="aspect-square rounded-lg bg-slate-50 dark:bg-slate-700 mb-3 overflow-hidden relative">
                                {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />}
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs line-clamp-2 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.title}</h4>
                            <div className="flex flex-wrap items-baseline gap-1.5 mt-auto">
                                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{formatPrice(p.price)}</span>
                                {p.discount_price && p.discount_price > p.price && (
                                    <>
                                        <span className="text-xs font-bold text-slate-400 line-through">{formatPrice(p.discount_price)}</span>
                                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md ml-auto">
                                            -{Math.round(((p.discount_price - p.price) / p.discount_price) * 100)}%
                                        </span>
                                    </>
                                )}
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};
