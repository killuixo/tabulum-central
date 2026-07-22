import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';

// Leitor seguro de Variáveis de Ambiente (Vite/Vercel)
const getEnv = (key) => {
    try { return import.meta.env[key]; } catch(e) { return ''; }
};

// As 4 URLs cruciais
const URL_LEADS = getEnv('VITE_LEADS_URL');
const URL_EMENDAS = getEnv('VITE_EMENDAS_URL');
const URL_AGENDA = getEnv('VITE_AGENDA_URL');
const URL_DADOS_GERAIS = getEnv('VITE_DADOS_GERAIS_URL'); 

const formatCurrency = (num) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num || 0);

const parseCurrency = (val) => {
    if(!val) return 0;
    if(typeof val === 'number') return val;
    const str = String(val).replace(/[R$\s\.]/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// Inteligência de Temas
const getTemaFromOrigem = (origem) => {
    if (!origem) return "Não Definido";
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

const isFloripa = (str) => {
    if (!str) return false;
    const s = String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return s.includes('florianopolis') || s.includes('floripa');
};

const Icons = {
    Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
    Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Filter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    Building: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22"></line><line x1="15" y1="22" x2="15" y2="22"></line><line x1="9" y1="6" x2="9.01" y2="6"></line><line x1="15" y1="6" x2="15.01" y2="6"></line><line x1="9" y1="10" x2="9.01" y2="10"></line><line x1="15" y1="10" x2="15.01" y2="10"></line><line x1="9" y1="14" x2="9.01" y2="14"></line><line x1="15" y1="14" x2="15.01" y2="14"></line></svg>
};

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [data, setData] = useState({ leads: [], emendas: [], agenda: [], estado: [], capital: [] });
    const [loadingInfo, setLoadingInfo] = useState({ isLoading: true, stage: 'Iniciando...', progress: 0 });
    const [isMock, setIsMock] = useState(false);
    
    // Controles de Navegação e Filtro
    const [selectedEntity, setSelectedEntity] = useState(null); 
    const [territoryScope, setTerritoryScope] = useState('ALL'); // 'ALL' | 'CAPITAL' | 'INTERIOR'
    const [globalFilters, setGlobalFilters] = useState({ temas: [], regioes: [] });

    useEffect(() => {
        const loadData = async () => {
            setLoadingInfo({ isLoading: true, stage: 'Conectando aos servidores...', progress: 10 });
            try {
                const fetchJSON = async (url) => {
                    if(!url) return null;
                    const res = await fetch(url);
                    if(!res.ok) return null;
                    return await res.json();
                };

                // 1. LEADS
                setLoadingInfo({ isLoading: true, stage: 'Baixando Central de Leads (1/4)...', progress: 30 });
                let leadsRaw = await fetchJSON(URL_LEADS) || [];
                
                // 2. EMENDAS
                setLoadingInfo({ isLoading: true, stage: 'Processando Emendas (2/4)...', progress: 55 });
                let emendasRaw = await fetchJSON(URL_EMENDAS) || [];

                // 3. AGENDA
                setLoadingInfo({ isLoading: true, stage: 'Sincronizando Agenda (3/4)...', progress: 75 });
                let agendaRaw = await fetchJSON(URL_AGENDA) || [];

                // 4. DADOS GERAIS
                setLoadingInfo({ isLoading: true, stage: 'Cruzando Dados Eleitorais (4/4)...', progress: 90 });
                let dadosGerais = await fetchJSON(URL_DADOS_GERAIS) || { estado: [], capital: [] };

                // Mock Fallback
                if (leadsRaw.length === 0 && emendasRaw.length === 0) {
                    setIsMock(true);
                    leadsRaw = [
                        { nome: "João Silva", cidade: "Florianópolis", bairroReplan: "Campeche", origem: "Assinatura Horta Comunitária" },
                        { nome: "Maria Souza", cidade: "Lages", origem: "Seminário Agroecologia" },
                        { nome: "Carlos Mendes", cidade: "Florianópolis", bairroReplan: "Trindade", origem: "Fórum Mobilidade" }
                    ];
                    emendasRaw = [
                        { "NÚMERO DA EMENDA": "202401", "MUNICÍPIO": "Florianópolis", "OBJETO": "Equipamentos Horta", "TOTAL": "150000", "TEMA": "Agricultura urbana", "ARTICULADOR": "Ana", "REGIÃO": "Grande Florianópolis" },
                        { "NÚMERO DA EMENDA": "202402", "MUNICÍPIO": "Lages", "OBJETO": "Feira Orgânica", "TOTAL": "80000", "TEMA": "Agroecologia", "ARTICULADOR": "Beto", "REGIÃO": "Serra" }
                    ];
                    agendaRaw = [
                        { "Título": "Reunião Comunitária", "Município": "Florianópolis", "Bairro": "Campeche", "Início": new Date().toISOString(), "Articulador": "Ana", "Classe de Atividade": "Comunidade" },
                        { "Título": "Visita Técnica", "Município": "Lages", "Início": new Date().toISOString(), "Articulador": "Beto", "Classe de Atividade": "Fiscalização" }
                    ];
                    dadosGerais = {
                        estado: [
                            { Cidade: "Lages", "Votos 2022": "1500", "Região do Estado": "Serra" },
                            { Cidade: "Joinville", "Votos 2022": "3200", "Região do Estado": "Norte" }
                        ],
                        capital: [
                            { Bairro: "Campeche", "Votos 2022": "1800", Região: "Sul da Ilha" },
                            { Bairro: "Trindade", "Votos 2022": "1650", Região: "Centro" }
                        ]
                    };
                }

                // Normalização Rápida
                const leads = leadsRaw.map((l, i) => ({
                    id: `l_${i}`,
                    nome: l['NOME'] || l['nome'] || 'Anônimo',
                    municipio: (l['CIDADE'] || l['cidade'] || '').trim(),
                    bairro: (l['BAIRRO REVISADO + REPLAN'] || l['bairroReplan'] || l['bairro'] || '').trim(),
                    tema: getTemaFromOrigem(l['ORIGEM'] || l['origem'])
                })).filter(l => l.municipio);

                const emendas = emendasRaw.map((e, i) => ({
                    id: `e_${i}`,
                    numero: e['NÚMERO DA EMENDA'] || e['numero'] || '',
                    municipio: (e['MUNICÍPIO'] || e['municipio'] || '').trim(),
                    objeto: e['OBJETO'] || e['objeto'] || '',
                    total: parseCurrency(e['TOTAL'] || e['total']),
                    tema: e['TEMA'] || e['tema'] || '',
                    articulador: (e['ARTICULADOR'] || e['articulador'] || '').trim(),
                    regiao: e['REGIÃO'] || e['regiao'] || ''
                })).filter(e => e.numero);

                const agenda = agendaRaw.map((a, i) => ({
                    id: `a_${i}`,
                    titulo: a['Título'] || a['titulo'] || '',
                    municipio: (a['Município'] || a['municipio'] || '').trim(),
                    bairro: (a['Bairro'] || a['bairro'] || '').trim(),
                    articulador: (a['Articulador'] || a['articulador'] || '').trim(),
                    classe: a['Classe de Atividade'] || ''
                }));

                setData({ leads, emendas, agenda, estado: dadosGerais.estado || [], capital: dadosGerais.capital || [] });

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingInfo({ isLoading: false, stage: 'Concluído', progress: 100 });
            }
        };

        loadData();
    }, []);

    return (
        <AppContext.Provider value={{ ...data, loadingInfo, isMock, selectedEntity, setSelectedEntity, globalFilters, setGlobalFilters, territoryScope, setTerritoryScope }}>
            {children}
        </AppContext.Provider>
    );
};

const NativeBarChart = ({ data, colorClass, valueFormatter = (v) => v, maxItems = 5 }) => {
    const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
    const maxVal = sorted.length > 0 ? sorted[0].value : 1;

    if (sorted.length === 0) return <div className="p-4 text-gray-500 font-bold text-sm uppercase">Sem dados cruzados para este filtro.</div>;

    return (
        <div className="space-y-4 mt-4">
            {sorted.map((item, idx) => (
                <div key={idx}>
                    <div className="flex justify-between text-xs font-black uppercase mb-1 tracking-wider">
                        <span className="truncate pr-4">{item.name || 'Não Informado'}</span>
                        <span>{valueFormatter(item.value)}</span>
                    </div>
                    <div className="h-4 w-full bg-white border-2 border-black overflow-hidden relative">
                        <div 
                            className={`h-full border-r-2 border-black transition-all duration-1000 ${colorClass}`} 
                            style={{ width: `${Math.max((item.value / maxVal) * 100, 2)}%` }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Sidebar = () => {
    const { emendas, leads, selectedEntity, setSelectedEntity, globalFilters, setGlobalFilters, territoryScope, setTerritoryScope } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    
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
            if (isFloripa(l.municipio) && l.bairro) add('bairro', l.bairro, `Bairro (Capital): ${l.bairro}`);
        });
        return index;
    }, [emendas, leads]);

    const searchResults = useMemo(() => {
        if (searchTerm.length < 2) return [];
        const term = searchTerm.toLowerCase();
        return searchIndex.filter(i => i.label.toLowerCase().includes(term)).slice(0, 10);
    }, [searchTerm, searchIndex]);

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
        <div className="w-80 bg-[#FDFBF7] border-r-4 border-black flex flex-col z-20 flex-shrink-0 h-full">
            <div className="p-6 border-b-4 border-black bg-[#EAA221] cursor-pointer" onClick={() => setSelectedEntity(null)}>
                <h1 className="text-3xl font-black text-black tracking-tighter uppercase">TABULUM</h1>
                <p className="text-[10px] font-black tracking-widest uppercase mt-1">Inteligência Estratégica</p>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
                {/* CHAVE MESTRA: TERRITÓRIO */}
                <div className="p-4 border-b-4 border-black bg-white">
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 text-[#C1272D] flex items-center">
                        <Icons.MapPin /> <span className="ml-1">Foco Territorial</span>
                    </label>
                    <div className="flex flex-col gap-2 border-2 border-black p-1 bg-gray-100">
                        <button onClick={() => setTerritoryScope('ALL')} className={`p-2 text-xs font-black uppercase border-2 transition-colors ${territoryScope === 'ALL' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                            Visão Geral (Estado)
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => setTerritoryScope('CAPITAL')} className={`flex-1 p-2 text-[10px] font-black uppercase border-2 transition-colors ${territoryScope === 'CAPITAL' ? 'bg-[#007D8A] text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                                Capital (Floripa)
                            </button>
                            <button onClick={() => setTerritoryScope('INTERIOR')} className={`flex-1 p-2 text-[10px] font-black uppercase border-2 transition-colors ${territoryScope === 'INTERIOR' ? 'bg-[#C1272D] text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                                Interior (SC)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Busca Universal</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                <Icons.Search />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Local, articulador..." 
                                className="block w-full pl-10 pr-3 py-3 border-4 border-black bg-white font-bold text-sm focus:outline-none focus:border-[#C1272D] transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchResults.length > 0 && (
                                <ul className="absolute z-50 w-full mt-2 bg-white border-4 border-black max-h-60 overflow-auto shadow-[4px_4px_0_0_rgba(17,17,17,1)]">
                                    {searchResults.map((res, idx) => (
                                        <li 
                                            key={idx} 
                                            className="px-4 py-3 hover:bg-[#EAA221] cursor-pointer text-xs font-bold uppercase border-b-2 border-black last:border-0"
                                            onClick={() => { setSelectedEntity({type: res.type, name: res.name}); setSearchTerm(''); }}
                                        >
                                            {res.label}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center text-[10px] font-black uppercase tracking-widest mb-3 border-b-2 border-black pb-2">
                            <Icons.Filter /> <span className="ml-2">Filtros Cruzados</span>
                        </div>
                        
                        <div className="space-y-4">
                            {territoryScope !== 'CAPITAL' && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Regiões do Estado</label>
                                    <div className="max-h-32 overflow-y-auto border-2 border-black bg-white p-2 space-y-1 custom-scrollbar">
                                        {regioes.map(r => (
                                            <label key={r} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                                <div className={`w-4 h-4 border-2 border-black shrink-0 ${globalFilters.regioes.includes(r) ? 'bg-[#007D8A]' : 'bg-white'}`}></div>
                                                <span className="text-[10px] font-bold uppercase truncate group-hover:text-[#007D8A]">{r}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Temas de Atuação</label>
                                <div className="max-h-40 overflow-y-auto border-2 border-black bg-white p-2 space-y-1 custom-scrollbar">
                                    {temas.map(t => (
                                        <label key={t} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                            <div className={`w-4 h-4 border-2 border-black shrink-0 ${globalFilters.temas.includes(t) ? 'bg-[#EAA221]' : 'bg-white'}`}></div>
                                            <span className="text-[10px] font-bold uppercase truncate group-hover:text-[#EAA221]">{t}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { leads, emendas, agenda, estado, capital, globalFilters, territoryScope, isMock } = useContext(AppContext);

    // Filtros unificados baseados no scope e globalFilters
    const filterByTerritory = (mun) => {
        if (territoryScope === 'CAPITAL') return isFloripa(mun);
        if (territoryScope === 'INTERIOR') return !isFloripa(mun);
        return true;
    };

    const filteredEmendas = useMemo(() => {
        return emendas.filter(e => {
            if (!filterByTerritory(e.municipio)) return false;
            if (globalFilters.regioes.length > 0 && !globalFilters.regioes.includes(e.regiao)) return false;
            if (globalFilters.temas.length > 0 && !globalFilters.temas.includes(e.tema)) return false;
            return true;
        });
    }, [emendas, globalFilters, territoryScope]);

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            if (!filterByTerritory(l.municipio)) return false;
            if (globalFilters.temas.length > 0 && l.tema && !globalFilters.temas.includes(l.tema)) return false;
            // Leads não tem 'região' mapeada facilmente sem cruzar, ignorando filtro de região para leads por simplificação
            return true;
        });
    }, [leads, globalFilters, territoryScope]);

    const filteredAgenda = useMemo(() => {
        return agenda.filter(a => filterByTerritory(a.municipio));
    }, [agenda, territoryScope]);

    // Estatísticas Globais
    const totalVotos = useMemo(() => {
        if (territoryScope === 'CAPITAL') return capital.reduce((acc, curr) => acc + parseInt(curr['Votos 2022'] || 0, 10), 0);
        if (territoryScope === 'INTERIOR') return estado.filter(e => !isFloripa(e.Cidade)).reduce((acc, curr) => acc + parseInt(curr['Votos 2022'] || 0, 10), 0);
        return estado.reduce((acc, curr) => acc + parseInt(curr['Votos 2022'] || 0, 10), 0);
    }, [estado, capital, territoryScope]);

    const stats = {
        leads: filteredLeads.length,
        emendasCount: filteredEmendas.length,
        emendasValor: filteredEmendas.reduce((acc, curr) => acc + curr.total, 0),
        agendas: filteredAgenda.length,
        votos: totalVotos
    };

    // Cruzamentos Específicos para os Gráficos
    const crossChartTemasLeads = useMemo(() => {
        const map = {};
        filteredLeads.forEach(l => { const t = l.tema || 'Outros'; map[t] = (map[t] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredLeads]);

    const crossChartTemasEmendas = useMemo(() => {
        const map = {};
        filteredEmendas.forEach(e => { const t = e.tema || 'Outros'; map[t] = (map[t] || 0) + e.total; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredEmendas]);

    const crossChartArticuladores = useMemo(() => {
        const map = {};
        filteredAgenda.forEach(a => { 
            if(a.articulador) {
                if(!map[a.articulador]) map[a.articulador] = { agendas: 0, emendas: 0 };
                map[a.articulador].agendas += 1;
            }
        });
        filteredEmendas.forEach(e => {
            if(e.articulador) {
                if(!map[e.articulador]) map[e.articulador] = { agendas: 0, emendas: 0 };
                map[e.articulador].emendas += 1;
            }
        });
        return Object.entries(map).map(([name, data]) => ({ name, value: data.agendas + data.emendas, ...data }));
    }, [filteredAgenda, filteredEmendas]);

    const crossChartLocais = useMemo(() => {
        const map = {};
        if (territoryScope === 'CAPITAL') {
            filteredLeads.forEach(l => { if(l.bairro) map[l.bairro] = (map[l.bairro] || 0) + 1; });
        } else {
            filteredLeads.forEach(l => { if(l.municipio) map[l.municipio] = (map[l.municipio] || 0) + 1; });
        }
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredLeads, territoryScope]);

    return (
        <div className="space-y-8 w-full max-w-6xl mx-auto pb-12">
            {isMock && (
                <div className="bg-black text-white p-4 font-black uppercase text-xs flex items-center border-4 border-[#EAA221] shadow-[4px_4px_0_0_#EAA221]">
                    ⚠️ Demonstração visual (Variáveis não detectadas). Configure as URLs no Vercel para ver dados reais.
                </div>
            )}
            
            <div className="border-b-4 border-black pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-black">
                        Painel Analítico <span className="text-[#C1272D]">{territoryScope === 'CAPITAL' ? '- Floripa' : territoryScope === 'INTERIOR' ? '- Interior' : '- Global'}</span>
                    </h2>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Cruzamento de 4 Bases de Dados</p>
                </div>
                <div className="text-right hidden md:block">
                    <span className="text-3xl font-black text-[#C1272D] leading-none block">{stats.votos.toLocaleString()}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Votos Base (2022)</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Users /><span className="ml-2">Lideranças Base</span></h3>
                    <div className="text-4xl font-black">{stats.leads}</div>
                    <div className="h-2 w-full bg-black mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.FileText /><span className="ml-2">Vol. Emendas</span></h3>
                    <div className="text-2xl font-black break-words">{formatCurrency(stats.emendasValor)}</div>
                    <div className="text-[10px] font-bold mt-1 text-gray-400 uppercase">{stats.emendasCount} Emendas</div>
                    <div className="h-2 w-full bg-[#EAA221] mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Calendar /><span className="ml-2">Presença (Agenda)</span></h3>
                    <div className="text-4xl font-black">{stats.agendas}</div>
                    <div className="h-2 w-full bg-[#C1272D] mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between md:hidden">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Votos Base 2022</h3>
                    <div className="text-3xl font-black text-[#C1272D]">{stats.votos.toLocaleString()}</div>
                    <div className="h-2 w-full bg-gray-200 mt-2 border border-black"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Comparativo de Temas */}
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col">
                    <h3 className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-4 flex items-center justify-between">
                        Engajamento vs Investimento (Temas)
                    </h3>
                    <div className="flex-1 space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Por Volume de Lideranças</p>
                            <NativeBarChart data={crossChartTemasLeads} colorClass="bg-black" maxItems={3} />
                        </div>
                        <div className="border-t-2 border-dashed border-gray-300 pt-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Por R$ Destinado (Emendas)</p>
                            <NativeBarChart data={crossChartTemasEmendas} colorClass="bg-[#EAA221]" valueFormatter={formatCurrency} maxItems={3} />
                        </div>
                    </div>
                </div>

                {/* Força Articuladores & Locais */}
                <div className="flex flex-col gap-8">
                    <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col h-full">
                        <h3 className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-2">Performance Articuladores</h3>
                        <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase">Volume Agendas + Volume Emendas (Qtd)</p>
                        <div className="flex-1 overflow-y-auto">
                            <NativeBarChart data={crossChartArticuladores} colorClass="bg-[#C1272D]" maxItems={4} />
                        </div>
                    </div>

                    <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col h-full">
                        <h3 className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-2">
                            Top {territoryScope === 'CAPITAL' ? 'Bairros' : 'Municípios'} (Leads)
                        </h3>
                        <div className="flex-1 overflow-y-auto">
                            <NativeBarChart data={crossChartLocais} colorClass="bg-[#007D8A]" maxItems={4} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FichaCompleta = () => {
    const { selectedEntity, setSelectedEntity, leads, emendas, agenda, estado, capital } = useContext(AppContext);
    
    const entityData = useMemo(() => {
        const { type, name } = selectedEntity;
        const n = String(name).toLowerCase();
        
        let relLeads = [];
        let relEmendas = [];
        let relAgendas = [];
        let relVotos = null;

        if (type === 'municipio') {
            relLeads = leads.filter(l => String(l.municipio).toLowerCase() === n);
            relEmendas = emendas.filter(e => String(e.municipio).toLowerCase() === n);
            relAgendas = agenda.filter(a => String(a.municipio).toLowerCase() === n);
            
            const v = estado.find(r => String(r['Cidade'] || r['Município'] || '').toLowerCase() === n);
            if (v) relVotos = { type: 'Estado (SC)', votos: v['Votos 2022'] || 0, regiao: v['Região do Estado'] || '' };
        } 
        else if (type === 'bairro') {
            relLeads = leads.filter(l => isFloripa(l.municipio) && String(l.bairro).toLowerCase() === n);
            relAgendas = agenda.filter(a => isFloripa(a.municipio) && String(a.bairro).toLowerCase() === n);
            
            const v = capital.filter(r => String(r['Bairro'] || '').toLowerCase() === n);
            if (v.length > 0) {
                const totalVotos = v.reduce((acc, curr) => acc + parseInt(curr['Votos 2022'] || 0, 10), 0);
                relVotos = { type: 'Capital (Bairro)', votos: totalVotos, regiao: v[0]['Região'] || '' };
            }
        }
        else if (type === 'articulador') {
            relEmendas = emendas.filter(e => String(e.articulador).toLowerCase() === n);
            relAgendas = agenda.filter(a => String(a.articulador).toLowerCase() === n);
        }

        return { leads: relLeads, emendas: relEmendas, agendas: relAgendas, votos: relVotos };
    }, [selectedEntity, leads, emendas, agenda, estado, capital]);

    const valTotal = entityData.emendas.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="space-y-6 w-full max-w-5xl mx-auto pb-12">
            <button 
                onClick={() => setSelectedEntity(null)} 
                className="bg-black text-white px-4 py-2 font-black uppercase text-[10px] border-4 border-black hover:bg-gray-800 flex items-center w-fit shadow-[4px_4px_0_0_rgba(17,17,17,1)] transition-transform active:translate-y-1 active:shadow-none"
            >
                &larr; Voltar
            </button>

            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_rgba(17,17,17,1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#C1272D] border-l-4 border-b-4 border-black"></div>
                <span className="inline-block px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest border-2 border-black mb-4">
                    Ficha de {selectedEntity.type}
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tighter leading-none pr-10">{selectedEntity.name}</h1>
                
                {entityData.votos && (
                    <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t-2 border-dashed border-gray-300">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-gray-500">Votos Base (2022)</span>
                            <span className="text-2xl font-black text-[#C1272D]">{entityData.votos.votos}</span>
                        </div>
                        <div className="w-px bg-black hidden sm:block"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-gray-500">Classificação / Região</span>
                            <span className="text-xl font-black">{entityData.votos.regiao || '-'}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Emendas */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col col-span-1 md:col-span-2 lg:col-span-1">
                    <div className="p-4 bg-[#EAA221] border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.FileText/><span className="ml-2">Emendas</span></h3>
                        <span className="font-black text-sm bg-white border-2 border-black px-2">{entityData.emendas.length}</span>
                    </div>
                    <div className="p-4 bg-gray-50 border-b-4 border-black">
                        <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">Volume de Investimento</span>
                        <span className="text-xl font-black text-black">{formatCurrency(valTotal)}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] p-2 space-y-2">
                        {entityData.emendas.length > 0 ? entityData.emendas.map((e, i) => (
                            <div key={i} className="border-2 border-black p-2 hover:bg-gray-100 bg-white">
                                <div className="font-black text-sm uppercase leading-tight mb-1 truncate">{e.objeto}</div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase bg-gray-200 px-1 border border-gray-300">{e.tema}</span>
                                    <span className="font-black text-xs text-[#007D8A]">{formatCurrency(e.total)}</span>
                                </div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>

                {/* Agendas */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col">
                    <div className="p-4 bg-[#C1272D] text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.Calendar/><span className="ml-2">Agendas</span></h3>
                        <span className="font-black text-sm bg-black border-2 border-white px-2">{entityData.agendas.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[380px] p-2 space-y-2">
                        {entityData.agendas.length > 0 ? entityData.agendas.map((a, i) => (
                            <div key={i} className="border-2 border-black p-2 hover:bg-gray-100 bg-white">
                                <div className="font-black text-xs uppercase leading-tight mb-1 line-clamp-2">{a.titulo}</div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">Artic: <span className="text-black">{a.articulador || '-'}</span></div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>

                {/* Leads */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col">
                    <div className="p-4 bg-black text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.Users/><span className="ml-2">Lideranças</span></h3>
                        <span className="font-black text-sm bg-white text-black border-2 border-black px-2">{entityData.leads.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[380px] p-2 space-y-2">
                        {entityData.leads.length > 0 ? entityData.leads.map((l, i) => (
                            <div key={i} className="border-b-2 border-gray-200 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0 pl-1">
                                <div className="font-black text-xs uppercase leading-tight truncate">{l.nome}</div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase truncate mt-0.5">{l.tema}</div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

const AppContent = () => {
    const { loadingInfo, selectedEntity } = useContext(AppContext);

    if (loadingInfo.isLoading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-4">
            <div className="w-16 h-16 border-4 border-[#FDFBF7] border-t-[#C1272D] border-r-[#EAA221] border-b-[#007D8A] rounded-full animate-spin mb-8 shadow-md"></div>
            <div className="w-full max-w-xs bg-white border-4 border-black p-4 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col gap-3 text-center">
                <p className="text-xs font-black tracking-widest uppercase text-black">{loadingInfo.stage}</p>
                <div className="w-full h-3 bg-gray-200 border-2 border-black overflow-hidden">
                    <div className="h-full bg-black transition-all duration-300 ease-out" style={{ width: `${loadingInfo.progress}%` }}></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#FDFBF7] text-[#111111] font-sans">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative">
                {/* Padrão de Fundo (Dots) Mondrian Style */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#111 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10 w-full h-full">
                    {selectedEntity ? <FichaCompleta /> : <Dashboard />}
                </div>
            </main>
        </div>
    );
};

export default function App() {
    return (
        <AppProvider>
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #FDFBF7; border-left: 2px solid #111; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; }
                * { scrollbar-width: thin; scrollbar-color: #111 #FDFBF7; }
            `}} />
            <AppContent />
        </AppProvider>
    );
}
