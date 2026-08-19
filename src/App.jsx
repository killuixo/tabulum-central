// ... existing code ...
            </div>
            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden no-print" onClick={() => setIsMobileMenuOpen(false)}></div>}
        </>
    );
};

const SortableBarChart = ({ data, colorClass, valueFormatter = (v) => v, onLabelClick }) => {
    const [sortDesc, setSortDesc] = useState(true);
    // Removemos o filtro que escondia os dados não informados do gráfico principal
    const sortedData = useMemo(() => [...data].sort((a, b) => sortDesc ? b.value - a.value : a.value - b.value), [data, sortDesc]);
    const maxVal = data.length > 0 ? Math.max(...data.map(d => d.value)) : 1;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-end items-center mb-4 border-b-2 border-black pb-2 shrink-0 no-print">
                <button onClick={() => setSortDesc(!sortDesc)} className="text-[10px] font-black uppercase text-gray-500 hover:text-black flex items-center transition-colors">
                    Ordem {sortDesc ? 'Decrescente' : 'Crescente'} {sortDesc ? <Icons.SortDesc /> : <Icons.SortAsc />}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-[150px]">
                {sortedData.length === 0 ? (
                    <div className="p-4 text-gray-400 font-bold text-sm uppercase text-center border-2 border-dashed border-gray-300">Nenhum registro validado.</div>
                ) : (
                    sortedData.map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-xs font-black uppercase mb-1 tracking-wider">
                                <span 
                                    className={`truncate pr-4 ${onLabelClick && item.name !== 'Não Informado' ? 'cursor-pointer hover:underline text-[#C1272D]' : ''}`}
                                    onClick={() => onLabelClick && item.name !== 'Não Informado' && onLabelClick(item.name)}
                                >
                                    {item.name}
                                </span>
                                <span>{valueFormatter(item.value)}</span>
                            </div>
                            <div className="h-4 w-full bg-gray-100 border-2 border-black flex overflow-hidden">
                                <div 
                                    className={`h-full border-r-2 border-black transition-all duration-1000 ${colorClass}`} 
                                    style={{ width: `${Math.max((item.value / maxVal) * 100, 1.5)}%` }}
                                ></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const DimensionSelect = ({ value, onChange, options }) => (
// ... existing code ...
```

Essa correção limpa o bug de compilação e estabiliza completamente o motor gráfico para renderizar valores de bairros vazios sem esconder as informações da Capital! Você já pode testar novamente com todos os dados da agenda e filtrando por Floripa.
