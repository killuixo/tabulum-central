<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TABULUM - Central de Inteligência</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        carmesim: '#C1272D',
                        mostarda: '#EAA221',
                        azulesverdeado: '#007D8A',
                        fundo: '#FDFBF7',
                        texto: '#111111'
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    boxShadow: {
                        'mondrian': '6px 6px 0px 0px rgba(17, 17, 17, 1)',
                        'mondrian-sm': '4px 4px 0px 0px rgba(17, 17, 17, 1)',
                        'mondrian-hover': '2px 2px 0px 0px rgba(17, 17, 17, 1)'
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #FDFBF7; color: #111111; margin: 0; overflow: hidden; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #FDFBF7; border-left: 2px solid #111; }
        ::-webkit-scrollbar-thumb { background: #111; }
        
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .loader { border: 4px solid #FDFBF7; border-top-color: #C1272D; border-right-color: #EAA221; border-bottom-color: #007D8A; animation: spinner 1s linear infinite; }
        @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>

    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useMemo, createContext, useContext } = React;

        // Leitor seguro de Variáveis de Ambiente (Funciona no Vercel, Vite, Next, etc)
        const getEnv = (key) => {
            try { if (typeof import !== 'undefined' && import.meta && import.meta.env) return import.meta.env[key]; } catch(e){}
            try { if (typeof process !== 'undefined' && process.env) return process.env[key]; } catch(e){}
            try { if (window && window[key]) return window[key]; } catch(e){}
            return '';
        };

        const URLS = {
            leads: getEnv('VITE_LEADS_URL') || getEnv('NEXT_PUBLIC_LEADS_URL'),
            emendas: getEnv('VITE_EMENDAS_URL') || getEnv('NEXT_PUBLIC_EMENDAS_URL'),
            agenda: getEnv('VITE_AGENDA_URL') || getEnv('NEXT_PUBLIC_AGENDA_URL'),
            estado: getEnv('VITE_ESTADO_URL') || getEnv('NEXT_PUBLIC_ESTADO_URL'),
            capital: getEnv('VITE_CAPITAL_URL') || getEnv('NEXT_PUBLIC_CAPITAL_URL')
        };

        const formatCurrency = (num) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num || 0);

        const parseCurrency = (val) => {
            if(!val) return 0;
            if(typeof val === 'number') return val;
            const str = String(val).replace(/[R$\s\.]/g, '').replace(',', '.');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        };

        // Ícones SVG minimalistas
        const Icons = {
            Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
            MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
            Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
            FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
            Filter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
            ChevronRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="9 18 15 12 9 6"></polyline></svg>
        };

        const getTemaFromOrigem = (origem) => {
            if (!origem) return "Outros";
            const o = String(origem).toLowerCase();
            if (/abelha/.test(o)) return "Abelhas sem ferrão";
            if (/agricultura urbana|horta/.test(o)) return "Agricultura urbana";
            if (/agroecologia|orgânico/.test(o)) return "Agroecologia";
            if (/cultura|música|arte/.test(o)) return "Cultura";
            if (/educação|escola/.test(o)) return "Educação";
            if (/climática|ambienta/.test(o)) return "Meio Ambiente";
            if (/mobilidade/.test(o)) return "Mobilidade";
            if (/saneamento/.test(o)) return "Saneamento";
            if (/saúde/.test(o)) return "Saúde";
            if (/alimentos|cozinha/.test(o)) return "Segurança Alimentar";
            return "Outros";
        };

        const AppContext = createContext();

        const AppProvider = ({ children }) => {
            const [data, setData] = useState({ leads: [], emendas: [], estado: [], capital: [] });
            const [loading, setLoading] = useState(true);
            const [isMock, setIsMock] = useState(false);
            
            const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'municipio'|'bairro'|'articulador', name: string }
            const [globalFilters, setGlobalFilters] = useState({ temas: [], regioes: [] });

            useEffect(() => {
                const loadData = async () => {
                    setLoading(true);
                    try {
                        const fetchCSV = async (url) => {
                            if(!url) return [];
                            const res = await fetch(url);
                            if(!res.ok) return [];
                            const text = await res.text();
                            return new Promise(resolve => Papa.parse(text, { header: true, skipEmptyLines: true, complete: r => resolve(r.data) }));
                        };

                        // Tenta buscar das APIs
                        let leadsRaw = await fetchCSV(URLS.leads);
                        let emendasRaw = await fetchCSV(URLS.emendas);
                        let estadoRaw = await fetchCSV(URLS.estado);
                        let capitalRaw = await fetchCSV(URLS.capital);

                        // Fallback Silencioso para Mock (Se as variáveis de ambiente não estiverem configuradas na prévia)
                        if (leadsRaw.length === 0 && emendasRaw.length === 0) {
                            setIsMock(true);
                            leadsRaw = [
                                { NOME: "João Silva", CIDADE: "Florianópolis", "BAIRRO REVISADO + REPLAN": "Campeche", ORIGEM: "Assinatura Horta Comunitária" },
                                { NOME: "Maria Souza", CIDADE: "Lages", ORIGEM: "Seminário Agroecologia" },
                                { NOME: "Carlos Mendes", CIDADE: "Florianópolis", "BAIRRO REVISADO + REPLAN": "Trindade", ORIGEM: "Fórum Mobilidade" },
                                { NOME: "Ana Clara", CIDADE: "Joinville", ORIGEM: "Plenária Cultura" }
                            ];
                            emendasRaw = [
                                { "NÚMERO DA EMENDA": "202401", MUNICÍPIO: "Florianópolis", OBJETO: "Equipamentos Horta", TOTAL: "150000", TEMA: "Agricultura urbana", ARTICULADOR: "Ana", REGIÃO: "Grande Florianópolis" },
                                { "NÚMERO DA EMENDA": "202402", MUNICÍPIO: "Lages", OBJETO: "Feira Orgânica", TOTAL: "80000", TEMA: "Agroecologia", ARTICULADOR: "Beto", REGIÃO: "Serra" },
                                { "NÚMERO DA EMENDA": "202403", MUNICÍPIO: "Joinville", OBJETO: "Apoio Festival", TOTAL: "50000", TEMA: "Cultura", ARTICULADOR: "Carlos", REGIÃO: "Norte" }
                            ];
                            estadoRaw = [
                                { Cidade: "Lages", "Votos 2022": "1500", "Região do Estado": "Serra" },
                                { Cidade: "Joinville", "Votos 2022": "3200", "Região do Estado": "Norte" }
                            ];
                            capitalRaw = [
                                { Bairro: "Campeche", "Votos 2022": "1800", Região: "Sul da Ilha" },
                                { Bairro: "Trindade", "Votos 2022": "1650", Região: "Centro" }
                            ];
                        }

                        // Processamento Limpo
                        const leads = leadsRaw.map((l, i) => ({
                            id: i,
                            nome: l['NOME'] || l['nome'] || 'Anônimo',
                            municipio: (l['CIDADE'] || l['cidade'] || '').trim(),
                            bairro: (l['BAIRRO REVISADO + REPLAN'] || l['bairro'] || '').trim(),
                            tema: getTemaFromOrigem(l['ORIGEM'] || l['origem'])
                        })).filter(l => l.municipio);

                        const emendas = emendasRaw.map((e, i) => ({
                            id: i,
                            numero: e['NÚMERO DA EMENDA'] || e['numero'] || '',
                            municipio: (e['MUNICÍPIO'] || e['municipio'] || '').trim(),
                            objeto: e['OBJETO'] || e['objeto'] || '',
                            total: parseCurrency(e['TOTAL'] || e['total']),
                            tema: e['TEMA'] || e['tema'] || '',
                            articulador: (e['ARTICULADOR'] || e['articulador'] || '').trim(),
                            regiao: e['REGIÃO'] || e['regiao'] || ''
                        })).filter(e => e.numero);

                        setData({ leads, emendas, estado: estadoRaw, capital: capitalRaw });
                    } catch (err) {
                        console.error(err);
                    } finally {
                        setLoading(false);
                    }
                };

                loadData();
            }, []);

            return (
                <AppContext.Provider value={{ ...data, loading, isMock, selectedEntity, setSelectedEntity, globalFilters, setGlobalFilters }}>
                    {children}
                </AppContext.Provider>
            );
        };

        const NativeBarChart = ({ data, color, maxItems = 5 }) => {
            const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
            const maxVal = sorted.length > 0 ? sorted[0].value : 1;

            if (sorted.length === 0) return <div className="p-4 text-gray-500 font-bold text-sm">Sem dados suficientes.</div>;

            return (
                <div className="space-y-4 mt-4">
                    {sorted.map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-xs font-black uppercase mb-1 tracking-wider">
                                <span className="truncate pr-4">{item.name || 'Não Informado'}</span>
                                <span>{item.isCurrency ? formatCurrency(item.value) : item.value}</span>
                            </div>
                            <div className="h-4 w-full bg-gray-200 border-2 border-black overflow-hidden">
                                <div 
                                    className={`h-full border-r-2 border-black transition-all duration-1000 ${color}`} 
                                    style={{ width: `${Math.max((item.value / maxVal) * 100, 2)}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        };

        const Sidebar = () => {
            const { emendas, leads, selectedEntity, setSelectedEntity, globalFilters, setGlobalFilters } = useContext(AppContext);
            const [searchTerm, setSearchTerm] = useState('');
            
            // Índice Unificado de Busca
            const searchIndex = useMemo(() => {
                const index = [];
                const add = (type, name, label) => {
                    if (name && !index.some(i => i.name === name && i.type === type)) {
                        index.push({ type, name, label: label || name });
                    }
                };
                emendas.forEach(e => {
                    add('municipio', e.municipio, `Município: ${e.municipio}`);
                    add('articulador', e.articulador, `Articulador: ${e.articulador}`);
                });
                leads.forEach(l => {
                    if (l.municipio === 'Florianópolis' && l.bairro) add('bairro', l.bairro, `Bairro (Capital): ${l.bairro}`);
                });
                return index;
            }, [emendas, leads]);

            const searchResults = useMemo(() => {
                if (searchTerm.length < 2) return [];
                const term = searchTerm.toLowerCase();
                return searchIndex.filter(i => i.label.toLowerCase().includes(term)).slice(0, 10);
            }, [searchTerm, searchIndex]);

            // Opções de Filtro Global
            const regioes = useMemo(() => [...new Set(emendas.map(e => e.regiao).filter(Boolean))].sort(), [emendas]);
            const temas = useMemo(() => [...new Set(emendas.map(e => e.tema).filter(Boolean))].sort(), [emendas]);

            const toggleFilter = (type, value) => {
                setGlobalFilters(prev => {
                    const current = prev[type];
                    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
                    return { ...prev, [type]: next };
                });
            };

            return (
                <div className="w-80 bg-white border-r-4 border-black flex flex-col z-20 flex-shrink-0 h-full shadow-[4px_0_0_0_rgba(17,17,17,1)] relative">
                    <div className="p-6 border-b-4 border-black bg-mostarda cursor-pointer" onClick={() => setSelectedEntity(null)}>
                        <h1 className="text-3xl font-black text-texto tracking-tighter uppercase">TABULUM</h1>
                        <p className="text-[10px] font-black tracking-widest uppercase mt-1">Central de Inteligência</p>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-8 bg-fundo">
                        
                        {/* Busca Universal */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Busca Universal</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                    <Icons.Search />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Buscar local, pessoa..." 
                                    className="block w-full pl-10 pr-3 py-3 border-4 border-black bg-white font-bold text-sm focus:outline-none focus:ring-0 focus:border-carmesim transition-colors shadow-mondrian-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchResults.length > 0 && (
                                    <ul className="absolute z-50 w-full mt-2 bg-white border-4 border-black shadow-mondrian max-h-60 overflow-auto">
                                        {searchResults.map((res, idx) => (
                                            <li 
                                                key={idx} 
                                                className="px-4 py-3 hover:bg-mostarda cursor-pointer text-xs font-bold uppercase border-b-2 border-black last:border-0 transition-colors"
                                                onClick={() => { setSelectedEntity({type: res.type, name: res.name}); setSearchTerm(''); }}
                                            >
                                                {res.label}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Filtros Globais */}
                        <div>
                            <div className="flex items-center text-[10px] font-black uppercase tracking-widest mb-3 border-b-2 border-black pb-2">
                                <Icons.Filter /> <span className="ml-2">Filtros Cruzados</span>
                            </div>
                            
                            <div className="space-y-6 mt-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Regiões do Estado</label>
                                    <div className="max-h-40 overflow-y-auto border-2 border-black bg-white p-2 space-y-1">
                                        {regioes.map(r => (
                                            <label key={r} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                                <div className={`w-4 h-4 border-2 border-black flex-shrink-0 transition-colors ${globalFilters.regioes.includes(r) ? 'bg-azulesverdeado' : 'bg-white'}`}></div>
                                                <span className="text-xs font-bold uppercase truncate group-hover:text-azulesverdeado">{r}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Temas de Atuação</label>
                                    <div className="max-h-40 overflow-y-auto border-2 border-black bg-white p-2 space-y-1">
                                        {temas.map(t => (
                                            <label key={t} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                                <div className={`w-4 h-4 border-2 border-black flex-shrink-0 transition-colors ${globalFilters.temas.includes(t) ? 'bg-mostarda' : 'bg-white'}`}></div>
                                                <span className="text-xs font-bold uppercase truncate group-hover:text-mostarda">{t}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const Dashboard = () => {
            const { leads, emendas, globalFilters, isMock } = useContext(AppContext);

            // Aplica filtros globais
            const filteredEmendas = useMemo(() => {
                return emendas.filter(e => {
                    if (globalFilters.regioes.length > 0 && !globalFilters.regioes.includes(e.regiao)) return false;
                    if (globalFilters.temas.length > 0 && !globalFilters.temas.includes(e.tema)) return false;
                    return true;
                });
            }, [emendas, globalFilters]);

            const filteredLeads = useMemo(() => {
                return leads.filter(l => {
                    if (globalFilters.temas.length > 0 && l.tema && !globalFilters.temas.includes(l.tema)) return false;
                    return true;
                });
            }, [leads, globalFilters]);

            const stats = {
                leads: filteredLeads.length,
                emendasCount: filteredEmendas.length,
                emendasValor: filteredEmendas.reduce((acc, curr) => acc + curr.total, 0),
                articuladores: new Set(filteredEmendas.map(e => e.articulador).filter(Boolean)).size
            };

            const chartDataTemas = useMemo(() => {
                const map = {};
                filteredEmendas.forEach(e => { const t = e.tema || 'Não Informado'; map[t] = (map[t] || 0) + e.total; });
                return Object.entries(map).map(([name, value]) => ({ name, value, isCurrency: true }));
            }, [filteredEmendas]);

            const chartDataLocais = useMemo(() => {
                const map = {};
                filteredEmendas.forEach(e => { const m = e.municipio || 'Não Informado'; map[m] = (map[m] || 0) + e.total; });
                return Object.entries(map).map(([name, value]) => ({ name, value, isCurrency: true }));
            }, [filteredEmendas]);

            return (
                <div className="space-y-8 animate-fade-in pb-12 w-full max-w-6xl mx-auto">
                    {isMock && (
                        <div className="bg-mostarda border-4 border-black p-4 shadow-mondrian flex items-center font-black uppercase text-sm">
                            ⚠️ MODO DEMONSTRAÇÃO: As variáveis de ambiente (VITE_LEADS_URL, etc) não estão configuradas neste ambiente de prévia. Exibindo dados fictícios.
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between border-b-4 border-black pb-4">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tight">Visão Global do Mandato</h2>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Sistematização de Dados Cruzados</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white border-4 border-black p-6 shadow-mondrian hover:-translate-y-1 transition-transform">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Users /><span className="ml-2">Base de Leads</span></h3>
                            <div className="text-5xl font-black">{stats.leads}</div>
                            <div className="h-2 w-full bg-carmesim border-2 border-black mt-4"></div>
                        </div>
                        <div className="bg-white border-4 border-black p-6 shadow-mondrian hover:-translate-y-1 transition-transform">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.FileText /><span className="ml-2">Emendas Destinadas</span></h3>
                            <div className="text-3xl xl:text-4xl font-black break-words">{formatCurrency(stats.emendasValor)}</div>
                            <div className="text-xs font-bold text-gray-400 mt-1 uppercase">{stats.emendasCount} repasses</div>
                            <div className="h-2 w-full bg-mostarda border-2 border-black mt-4"></div>
                        </div>
                        <div className="bg-white border-4 border-black p-6 shadow-mondrian hover:-translate-y-1 transition-transform">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.MapPin /><span className="ml-2">Articuladores Ativos</span></h3>
                            <div className="text-5xl font-black">{stats.articuladores}</div>
                            <div className="h-2 w-full bg-azulesverdeado border-2 border-black mt-4"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                        <div className="bg-white border-4 border-black p-6 shadow-mondrian flex flex-col">
                            <h3 className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-2">Maiores Investimentos (Temas)</h3>
                            <div className="flex-1 overflow-y-auto">
                                <NativeBarChart data={chartDataTemas} color="bg-mostarda" maxItems={6} />
                            </div>
                        </div>

                        <div className="bg-white border-4 border-black p-6 shadow-mondrian flex flex-col">
                            <h3 className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-2">Top Municípios Atendidos</h3>
                            <div className="flex-1 overflow-y-auto">
                                <NativeBarChart data={chartDataLocais} color="bg-azulesverdeado" maxItems={6} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const FichaCompleta = () => {
            const { selectedEntity, setSelectedEntity, leads, emendas, estado, capital } = useContext(AppContext);
            
            const entityData = useMemo(() => {
                const { type, name } = selectedEntity;
                const n = String(name).toLowerCase();
                
                let relLeads = [];
                let relEmendas = [];
                let relVotos = null;

                if (type === 'municipio') {
                    relLeads = leads.filter(l => String(l.municipio).toLowerCase() === n);
                    relEmendas = emendas.filter(e => String(e.municipio).toLowerCase() === n);
                    // Procura Votos 
                    const v = estado.find(r => String(r['Cidade'] || r['cidade'] || '').toLowerCase() === n);
                    if (v) relVotos = { type: 'Estado (SC)', votos: v['Votos 2022'] || v['votos'] || 0, regiao: v['Região do Estado'] || '' };
                } 
                else if (type === 'bairro') {
                    relLeads = leads.filter(l => l.municipio === 'Florianópolis' && String(l.bairro).toLowerCase() === n);
                    const v = capital.filter(r => String(r['Bairro'] || r['bairro'] || '').toLowerCase() === n);
                    if (v.length > 0) {
                        const totalVotos = v.reduce((acc, curr) => acc + parseInt(curr['Votos 2022'] || curr['votos'] || 0, 10), 0);
                        relVotos = { type: 'Capital (Bairro)', votos: totalVotos, regiao: v[0]['Região'] || '' };
                    }
                }
                else if (type === 'articulador') {
                    relEmendas = emendas.filter(e => String(e.articulador).toLowerCase() === n);
                }

                return { leads: relLeads, emendas: relEmendas, votos: relVotos };
            }, [selectedEntity, leads, emendas, estado, capital]);

            const valTotal = entityData.emendas.reduce((acc, curr) => acc + curr.total, 0);

            return (
                <div className="space-y-6 animate-fade-in pb-12 w-full max-w-5xl mx-auto">
                    <button 
                        onClick={() => setSelectedEntity(null)} 
                        className="bg-black text-white px-4 py-2 font-black uppercase text-[10px] border-4 border-black hover:bg-gray-800 transition-colors shadow-mondrian-sm flex items-center w-fit"
                    >
                        &larr; Voltar ao Painel
                    </button>

                    <div className="bg-white p-8 border-4 border-black shadow-mondrian relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-carmesim border-l-4 border-b-4 border-black"></div>
                        <span className="inline-block px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest border-2 border-black mb-4">
                            Ficha de {selectedEntity.type}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black text-texto uppercase tracking-tighter leading-none">{selectedEntity.name}</h1>
                        
                        {entityData.votos && (
                            <div className="mt-6 flex flex-wrap gap-4">
                                <div className="bg-gray-100 border-2 border-black px-4 py-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 block">Votos Base (2022)</span>
                                    <span className="text-xl font-black text-carmesim">{entityData.votos.votos}</span>
                                </div>
                                <div className="bg-gray-100 border-2 border-black px-4 py-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 block">Região</span>
                                    <span className="text-lg font-black">{entityData.votos.regiao || '-'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Box de Emendas */}
                        <div className="bg-white border-4 border-black shadow-mondrian flex flex-col">
                            <div className="p-4 bg-mostarda border-b-4 border-black flex justify-between items-center">
                                <h3 className="font-black uppercase flex items-center"><Icons.FileText/><span className="ml-2">Emendas Destinadas</span></h3>
                                <span className="font-black text-sm bg-white border-2 border-black px-2">{entityData.emendas.length}</span>
                            </div>
                            <div className="p-4 bg-gray-50 border-b-4 border-black">
                                <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">Volume de Investimento</span>
                                <span className="text-2xl font-black text-azulesverdeado">{formatCurrency(valTotal)}</span>
                            </div>
                            <div className="overflow-x-auto max-h-[400px]">
                                {entityData.emendas.length > 0 ? (
                                    <table className="w-full text-left">
                                        <tbody>
                                            {entityData.emendas.map((e, i) => (
                                                <tr key={i} className="border-b-2 border-gray-200 hover:bg-gray-100 transition-colors">
                                                    <td className="p-3">
                                                        <div className="font-black text-sm uppercase leading-tight mb-1">{e.objeto}</div>
                                                        <div className="text-[10px] font-bold text-gray-500 uppercase">{e.tema}</div>
                                                    </td>
                                                    <td className="p-3 text-right whitespace-nowrap font-black text-sm text-azulesverdeado">
                                                        {formatCurrency(e.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : <div className="p-8 text-center text-gray-400 font-bold uppercase text-sm">Nenhuma emenda registrada.</div>}
                            </div>
                        </div>

                        {/* Box de Leads */}
                        <div className="bg-white border-4 border-black shadow-mondrian flex flex-col">
                            <div className="p-4 bg-azulesverdeado text-white border-b-4 border-black flex justify-between items-center">
                                <h3 className="font-black uppercase flex items-center"><Icons.Users/><span className="ml-2">Lideranças (Base)</span></h3>
                                <span className="font-black text-sm bg-black text-white border-2 border-white px-2">{entityData.leads.length}</span>
                            </div>
                            <div className="overflow-x-auto max-h-[470px]">
                                {entityData.leads.length > 0 ? (
                                    <table className="w-full text-left">
                                        <tbody>
                                            {entityData.leads.map((l, i) => (
                                                <tr key={i} className="border-b-2 border-gray-200 hover:bg-gray-100 transition-colors">
                                                    <td className="p-3">
                                                        <div className="font-black text-sm uppercase leading-tight mb-1">{l.nome}</div>
                                                        <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                                            <span className="bg-gray-200 text-black px-1 border border-black">{l.tema}</span>
                                                            <span className="truncate">{l.bairro ? `${l.bairro} (Cap)` : l.municipio}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : <div className="p-8 text-center text-gray-400 font-bold uppercase text-sm">Nenhum lead com este filtro.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        const App = () => {
            const { loading, selectedEntity } = useContext(AppContext);

            if (loading) return (
                <div className="h-screen w-screen flex flex-col items-center justify-center bg-fundo">
                    <div className="loader w-16 h-16 mb-6"></div>
                    <p className="text-sm font-black tracking-widest uppercase border-4 border-black bg-white px-4 py-2 shadow-mondrian-sm">Sincronizando Dados...</p>
                </div>
            );

            return (
                <div className="flex h-screen w-full overflow-hidden bg-fundo">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
                        {/* Padrão de Fundo Sutil */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#111 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        
                        <div className="relative z-10 w-full h-full">
                            {selectedEntity ? <FichaCompleta /> : <Dashboard />}
                        </div>
                    </main>
                </div>
            );
        };

        const Root = () => (
            <AppProvider>
                <App />
            </AppProvider>
        );

        const rootElement = document.getElementById('root');
        const root = ReactDOM.createRoot(rootElement);
        root.render(<Root />);
    </script>
</body>
</html>
