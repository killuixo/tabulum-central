import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';

const getEnv = (key) => {
    try { return import.meta.env[key]; } catch(e) { return ''; }
};

const URL_LEADS = getEnv('VITE_LEADS_URL');
const URL_EMENDAS = getEnv('VITE_EMENDAS_URL');
const URL_AGENDA = getEnv('VITE_AGENDA_URL');
const URL_DADOS_GERAIS = getEnv('VITE_DADOS_GERAIS_URL'); 
const URL_CONTATOS = getEnv('VITE_CONTATOS_URL'); 

const formatCurrency = (num) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num || 0);

const parseCurrency = (val) => {
    if(!val) return 0;
    if(typeof val === 'number') return val;
    const str = String(val).replace(/[R$\s\.]/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

const parseNumberStrict = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    if (str === '-' || str === '') return 0;
    str = str.replace(/[R$\s]/g, '');
    if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (/\.\d{3}$/.test(str) || str.split('.').length > 2) {
        str = str.replace(/\./g, '');
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
};

const normalizeStr = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const isFloripa = (str) => {
    if (!str) return false;
    const s = normalizeStr(str);
    return s.includes('florianopolis') || s.includes('floripa') || s.includes('fpolis');
};

const isInvalidData = (str) => {
    if (!str) return true;
    const s = normalizeStr(str);
    return s === '' || s === '-' || s.includes('outros') || s.includes('nao informado') || s.includes('nao definido') || s.includes('tema nao definido');
};

const isPublicInstitution = (str) => {
    const s = normalizeStr(str);
    return s.includes('prefeitura') || s.includes('governo') || s.includes('universidade') || s.includes('udesc') || s.includes('ufsc') || s.includes('fundo') || s.includes('secretaria') || s.includes('ministerio') || s.includes('hospital') || s.includes('policia') || s.includes('bombeiro') || s.includes('cbm') || s.includes('pmsc');
};

const getTemaFromOrigem = (origem) => {
    if (!origem) return "Tema Não Definido";
    const o = String(origem).toLowerCase();
    if (/abelha/.test(o)) return "Abelhas sem ferrão";
    if (/agricultura urbana|horta/.test(o)) return "Agricultura urbana";
    if (/agroecologia|orgânico/.test(o)) return "Agroecologia";
    if (/cultura|música|arte/.test(o)) return "Cultura";
    if (/educação|escola/.test(o)) return "Educação";
    if (/climática|ambienta/.test(o)) return "Meio Ambiente";
    if (/mobilidade/.test(o)) return "Mobilidade Urbana";
    if (/saneamento/.test(o)) return "Cidade e Saneamento";
    if (/saúde/.test(o)) return "Saúde";
    if (/alimentos|cozinha/.test(o)) return "Segurança Alimentar";
    return "Outros Temas"; 
};

// Motor interpretador para buscar valores dinamicamente das colunas, evitando quebras
const getField = (obj, fieldName) => {
    if (!obj || typeof obj !== 'object') return '';
    const normField = normalizeStr(fieldName);
    for (const key in obj) {
        if (normalizeStr(key) === normField) return obj[key];
    }
    return '';
};

const safeCsvCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
};

const exportToCSV = (filename, rows) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.map(safeCsvCell).join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ExportToolbar = ({ onCsv, onPdf }) => (
    <div className="flex justify-end gap-2 mb-4 no-print shrink-0">
        <button onClick={onCsv} className="bg-black text-white px-4 py-2 font-black uppercase text-[10px] border-2 border-black hover:bg-gray-800 flex items-center transition-colors shadow-[4px_4px_0_0_rgba(17,17,17,1)] active:translate-y-1 active:shadow-none">
            <Icons.FileText /> <span className="ml-2">Exportar .CSV</span>
        </button>
        <button onClick={onPdf} className="bg-white text-black px-4 py-2 font-black uppercase text-[10px] border-2 border-black hover:bg-gray-100 flex items-center transition-colors shadow-[4px_4px_0_0_rgba(17,17,17,1)] active:translate-y-1 active:shadow-none">
            <Icons.FileText /> <span className="ml-2">Exportar .PDF</span>
        </button>
    </div>
);

const Icons = {
    Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
    Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Filter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    Briefcase: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    SortAsc: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><polyline points="18 15 12 9 6 15"></polyline></svg>,
    SortDesc: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><polyline points="6 9 12 15 18 9"></polyline></svg>
};

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [rawData, setRawData] = useState({ leads: [], emendas: [], agenda: [], contatos: [], estado: [], capital: [] });
    const [loadingInfo, setLoadingInfo] = useState({ isLoading: true, stage: 'Iniciando...', progress: 0 });
    const [isMock, setIsMock] = useState(false);
    
    const [selectedEntity, setSelectedEntity] = useState(null); 
    const [territoryScope, setTerritoryScope] = useState('INTERIOR'); 
    const [includeFloripa, setIncludeFloripa] = useState(false); 
    const [globalFilters, setGlobalFilters] = useState({ temas: [], regioes: [], distritos: [] });
    const [mainView, setMainView] = useState('dashboard');

    useEffect(() => {
        const loadData = async () => {
            setLoadingInfo({ isLoading: true, stage: 'Conectando aos servidores...', progress: 10 });
            try {
                const fetchJSON = async (url) => {
                    if(!url) return null;
                    try { const res = await fetch(url, { redirect: 'follow' }); return res.ok ? await res.json() : null; } catch (e) { return null; }
                };

                let leadsRaw = await fetchJSON(URL_LEADS) || [];
                let emendasRaw = await fetchJSON(URL_EMENDAS) || [];
                let agendaRaw = await fetchJSON(URL_AGENDA) || [];
                let contatosRaw = await fetchJSON(URL_CONTATOS) || [];
                let dadosGeraisRaw = await fetchJSON(URL_DADOS_GERAIS) || { estado: [], capital: [] };

                let dadosGerais = { estado: [], capital: [] };
                
                if (dadosGeraisRaw.estado && dadosGeraisRaw.estado.length > 0) {
                    const arr = Array.isArray(dadosGeraisRaw.estado[0]) ? dadosGeraisRaw.estado.slice(1) : dadosGeraisRaw.estado;
                    dadosGerais.estado = arr.map(row => {
                        const isArr = Array.isArray(row);
                        const keys = isArr ? [] : Object.keys(row);
                        return {
                            municipio: (isArr ? row[0] : row[keys[0]] || row['Cidade'] || '').trim(),
                            regiao: (isArr ? row[1] : row[keys[1]] || row['Região do Estado'] || '').trim(),
                            Votos2018: parseNumberStrict(isArr ? row[2] : row[keys[2]]), 
                            Votos2022: parseNumberStrict(isArr ? row[3] : row[keys[3]])  
                        };
                    });
                }
                
                if (dadosGeraisRaw.capital && dadosGeraisRaw.capital.length > 0) {
                    const arr = Array.isArray(dadosGeraisRaw.capital[0]) ? dadosGeraisRaw.capital.slice(1) : dadosGeraisRaw.capital;
                    dadosGerais.capital = arr.map(row => {
                        const isArr = Array.isArray(row);
                        const keys = isArr ? [] : Object.keys(row);
                        return {
                            municipio: 'Florianópolis',
                            bairro: (isArr ? row[3] : row[keys[3]] || row['Bairro'] || '').trim(),       
                            distrito: (isArr ? row[4] : row[keys[4]] || row['Distrito'] || '').trim(),   
                            regiao: (isArr ? row[5] : row[keys[5]] || row['Região'] || '').trim(),       
                            Votos2022: parseNumberStrict(isArr ? row[8] : row[keys[8]]),  
                            Votos2024: parseNumberStrict(isArr ? row[11] : row[keys[11]]) 
                        };
                    });
                }

                // Cria dicionários geográficos para cruzamento rápido
                const muniToRegiao = {};
                dadosGerais.estado.forEach(e => { if (e.municipio) muniToRegiao[normalizeStr(e.municipio)] = e.regiao; });

                const bairroToRegiao = {};
                const bairroToDistrito = {};
                dadosGerais.capital.forEach(c => {
                    if (c.bairro) {
                        bairroToRegiao[normalizeStr(c.bairro)] = c.regiao;
                        bairroToDistrito[normalizeStr(c.bairro)] = c.distrito;
                    }
                });

                const leads = leadsRaw.map((l, i) => {
                    const mun = String(getField(l, 'cidade')).trim();
                    const b = String(getField(l, 'bairro revisado + replan') || getField(l, 'bairroreplan') || getField(l, 'bairro')).trim();
                    return {
                        id: `l_${i}`,
                        nome: String(getField(l, 'nome') || 'Anônimo'),
                        municipio: mun,
                        bairro: b,
                        regiao: isFloripa(mun) ? bairroToRegiao[normalizeStr(b)] : muniToRegiao[normalizeStr(mun)],
                        distrito: isFloripa(mun) ? bairroToDistrito[normalizeStr(b)] : null,
                        tema: getTemaFromOrigem(getField(l, 'origem'))
                    };
                }).filter(l => l.municipio);

                const emendas = emendasRaw.map((e, i) => {
                    const mun = String(getField(e, 'municipio')).trim();
                    const razaoSocialRaw = String(getField(e, 'razao social')).trim();
                    const esfera = String(getField(e, 'esfera de aplicacao')).trim();
                    
                    let razaoSocialFinal = razaoSocialRaw;
                    if (isInvalidData(razaoSocialFinal)) {
                        if (esfera.toLowerCase().includes('munic')) razaoSocialFinal = 'Prefeitura de ' + mun;
                        else if (esfera.toLowerCase().includes('estadual')) razaoSocialFinal = 'Governo do Estado de SC';
                        else razaoSocialFinal = 'Entidades Não Informadas';
                    }

                    return {
                        id: `e_${i}`,
                        numero: String(getField(e, 'numero da emenda') || getField(e, 'numero')),
                        municipio: mun,
                        bairro: null,
                        regiao: String(getField(e, 'regiao') || muniToRegiao[normalizeStr(mun)] || '').trim(),
                        distrito: null,
                        tema: String(getField(e, 'tema')).trim(),
                        objeto: String(getField(e, 'objeto')).trim(),
                        total: parseCurrency(getField(e, 'total')),
                        articulador: String(getField(e, 'articulador')).trim(),
                        razaoSocial: razaoSocialFinal
                    };
                }).filter(e => e.numero);

                const agenda = agendaRaw.map((a, i) => {
                    let mun = String(getField(a, 'municipio')).trim();
                    const b = String(getField(a, 'bairro')).trim();
                    const local = String(getField(a, 'local')).trim();
                    
                    if (!mun && (normalizeStr(b).includes('centro') || normalizeStr(local).includes('alesc') || normalizeStr(local).includes('florianopolis'))) {
                        mun = 'Florianópolis';
                    }

                    return {
                        id: `a_${i}`,
                        titulo: String(getField(a, 'titulo')).trim(),
                        municipio: mun,
                        bairro: b,
                        regiao: isFloripa(mun) ? bairroToRegiao[normalizeStr(b)] : muniToRegiao[normalizeStr(mun)],
                        distrito: isFloripa(mun) ? bairroToDistrito[normalizeStr(b)] : null,
                        tema: '', 
                        articulador: String(getField(a, 'articulador')).trim(),
                        inicio: getField(a, 'inicio') || null
                    };
                });

                const contatos = contatosRaw.map((c, i) => {
                    const munBairro = String(getField(c, 'municipio_bairro') || getField(c, 'municipio') || getField(c, 'bairro replan')).trim();
                    const base = String(getField(c, 'base'));
                    const isF = base.includes('Florianópolis') || base.includes('Florianopolis');
                    
                    return {
                        id: `c_${i}`,
                        nome: String(getField(c, 'lideranca')).trim(),
                        base: base,
                        municipio: isF ? 'Florianópolis' : munBairro,
                        bairro: isF ? munBairro : null,
                        regiao: String(getField(c, 'regiao')).trim(),
                        distrito: String(getField(c, 'distrito')).trim(),
                        tema: String(getField(c, 'temas') || getField(c, 'tema')).trim(),
                        situacao: String(getField(c, 'situacao')).trim(),
                        articulador: String(getField(c, 'articulador')).trim()
                    };
                }).filter(c => c.nome);

                setRawData({ leads, emendas, agenda, contatos, estado: dadosGerais.estado, capital: dadosGerais.capital });

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingInfo({ isLoading: true, stage: 'Concluído', progress: 100 });
                setTimeout(() => setLoadingInfo({ isLoading: false, stage: 'Concluído', progress: 100 }), 2000);
            }
        };
        loadData();
    }, []);

    const filteredContext = useMemo(() => {
        const { leads, emendas, agenda, contatos, estado, capital } = rawData;
        const { temas, regioes, distritos } = globalFilters;

        const passesTerritory = (mun) => {
            const isF = isFloripa(mun);
            if (territoryScope === 'CAPITAL') return isF;
            if (territoryScope === 'INTERIOR') return isF ? includeFloripa : true;
            return true;
        };

        const passesGlobals = (item) => {
            // Lógica OR (OU) dentro da mesma categoria: se o tema do item estiver incluso na lista de temas selecionados
            if (temas.length > 0) {
                if (!item.tema || !temas.includes(item.tema)) return false;
            }
            if (regioes.length > 0) {
                if (!item.regiao || !regioes.includes(item.regiao)) return false;
            }
            if (distritos.length > 0) {
                if (!item.distrito || !distritos.includes(item.distrito)) return false;
            }
            return true;
        };

        return {
            leads: leads.filter(l => passesTerritory(l.municipio) && passesGlobals(l)),
            emendas: emendas.filter(e => passesTerritory(e.municipio) && passesGlobals(e)),
            agenda: agenda.filter(a => passesTerritory(a.municipio) && passesGlobals(a)),
            contatos: contatos.filter(c => passesTerritory(c.municipio) && passesGlobals(c)),
            estado: estado.filter(e => {
                if (!passesTerritory(e.municipio)) return false;
                if (regioes.length > 0 && (!e.regiao || !regioes.includes(e.regiao))) return false;
                return true;
            }),
            capital: capital.filter(c => {
                if (territoryScope === 'INTERIOR' && !includeFloripa) return false;
                if (regioes.length > 0 && (!c.regiao || !regioes.includes(c.regiao))) return false;
                if (distritos.length > 0 && (!c.distrito || !distritos.includes(c.distrito))) return false;
                return true;
            })
        };
    }, [rawData, territoryScope, includeFloripa, globalFilters]);

    return (
        <AppContext.Provider value={{ 
            ...filteredContext, 
            rawLeads: rawData.leads, rawContatos: rawData.contatos, rawEmendas: rawData.emendas, rawAgenda: rawData.agenda, rawEstado: rawData.estado, rawCapital: rawData.capital,
            loadingInfo, isMock, selectedEntity, setSelectedEntity, globalFilters, setGlobalFilters, territoryScope, setTerritoryScope, includeFloripa, setIncludeFloripa, mainView, setMainView 
        }}>
            {children}
        </AppContext.Provider>
    );
};

const LoadingScreen = ({ loadingInfo }) => {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-4 z-[9999]">
            {loadingInfo.progress < 100 ? (
                <div className="w-16 h-16 border-4 border-[#FDFBF7] border-t-[#C1272D] border-r-[#EAA221] border-b-[#007D8A] rounded-full animate-spin mb-8 shadow-md"></div>
            ) : (
                <div className="h-16 mb-8 flex items-center justify-center animate-fade-in">
                     <img src="https://raw.githubusercontent.com/killuixo/tabulum-central/refs/heads/main/icon-192.png" alt="icon" className="w-16 h-16 object-contain" />
                </div>
            )}
            <div className="w-full max-w-xs bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col gap-4 text-center">
                <p className="text-xs font-black tracking-widest uppercase text-black">{loadingInfo.stage}</p>
                <div className="w-full h-3 bg-gray-200 border-2 border-black overflow-hidden">
                    <div className="h-full bg-black transition-all duration-300 ease-out" style={{ width: `${loadingInfo.progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const Sidebar = () => {
    const { rawEmendas, rawContatos, rawCapital, setSelectedEntity, globalFilters, setGlobalFilters, territoryScope, setTerritoryScope, includeFloripa, setIncludeFloripa, mainView, setMainView } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Calcula opções de filtro a partir dos DADOS BRUTOS, assim selecionar um filtro não esconde os outros
    const regioesEstado = useMemo(() => [...new Set([...rawEmendas.map(e => e.regiao), ...rawContatos.map(c => c.regiao)].filter(r => !isInvalidData(r)))].sort(), [rawEmendas, rawContatos]);
    const temas = useMemo(() => [...new Set([...rawEmendas.map(e => e.tema), ...rawContatos.map(c => c.tema)].filter(t => !isInvalidData(t)))].sort(), [rawEmendas, rawContatos]);
    
    const regioesFpolis = useMemo(() => [...new Set(rawCapital?.map(c => c.regiao) || [])].filter(r => !isInvalidData(r)).sort(), [rawCapital]);
    const distritosFpolis = useMemo(() => [...new Set(rawCapital?.map(c => c.distrito) || [])].filter(d => !isInvalidData(d)).sort(), [rawCapital]);

    return (
        <>
            <div className="md:hidden bg-[#EAA221] border-b-4 border-black p-4 flex justify-between items-center z-50 no-print">
                <div className="flex items-center gap-2">
                    <img src="https://raw.githubusercontent.com/killuixo/tabulum-central/refs/heads/main/icon-192.png" alt="icon" className="w-8 h-8 object-contain" />
                    <div>
                        <h1 className="text-2xl font-black text-black tracking-tighter uppercase leading-none">TABULUM</h1>
                        <p className="text-[9px] font-black tracking-widest uppercase text-black">Central de Inteligência</p>
                    </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="bg-black text-white p-2 border-2 border-black"><Icons.Filter /></button>
            </div>

            <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out w-80 bg-[#FDFBF7] border-r-4 border-black flex flex-col z-40 h-full shadow-2xl md:shadow-none no-print`}>
                <div className="hidden md:flex flex-row p-6 border-b-4 border-black bg-[#EAA221] cursor-pointer items-center gap-4" onClick={() => {setSelectedEntity(null); setMainView('dashboard');}}>
                    <img src="https://raw.githubusercontent.com/killuixo/tabulum-central/refs/heads/main/icon-192.png" alt="icon" className="w-16 h-16 object-contain shrink-0" />
                    <div className="flex flex-col justify-center">
                        <h1 className="text-3xl font-black text-black tracking-tighter uppercase leading-none">TABULUM</h1>
                        <p className="text-[10px] font-black tracking-widest uppercase mt-1 text-black leading-tight">Central de<br/>Inteligência</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
                    <div className="p-4 border-b-4 border-black bg-white">
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-2 text-[#C1272D] flex items-center">
                            <Icons.MapPin /> <span className="ml-1">Foco Territorial</span>
                        </label>
                        <div className="flex flex-col gap-2 border-2 border-black p-1 bg-gray-100">
                            <button onClick={() => setTerritoryScope('INTERIOR')} className={`p-2 text-xs font-black uppercase border-2 transition-colors ${territoryScope === 'INTERIOR' ? 'bg-[#C1272D] text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                                Santa Catarina
                            </button>
                            <button onClick={() => setTerritoryScope('CAPITAL')} className={`p-2 text-xs font-black uppercase border-2 transition-colors ${territoryScope === 'CAPITAL' ? 'bg-[#007D8A] text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                                Florianópolis
                            </button>
                        </div>
                        {territoryScope === 'INTERIOR' && (
                            <label className="flex items-center space-x-2 mt-3 cursor-pointer group w-fit bg-gray-100 p-2 border-2 border-dashed border-gray-400 hover:bg-gray-200">
                                <input type="checkbox" checked={includeFloripa} onChange={e => setIncludeFloripa(e.target.checked)} className="w-4 h-4 accent-black border-2 border-black cursor-pointer" />
                                <span className="text-[10px] font-bold uppercase text-gray-600 group-hover:text-black">Incluir Floripa no Estado</span>
                            </label>
                        )}
                    </div>

                    <div className="p-4 space-y-6">
                        <div>
                            <div className="flex items-center text-[10px] font-black uppercase tracking-widest mb-3 border-b-2 border-black pb-2">
                                <Icons.Filter /> <span className="ml-2">Filtros Universais</span>
                            </div>
                            <div className="space-y-4">
                                {territoryScope === 'CAPITAL' ? (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Regiões da Capital</label>
                                            <div className="max-h-32 overflow-y-auto border-2 border-black bg-white p-2 space-y-1 custom-scrollbar">
                                                {regioesFpolis.map(r => (
                                                    <label key={r} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                                        <input type="checkbox" checked={globalFilters.regioes.includes(r)} onChange={() => setGlobalFilters(prev => ({ ...prev, regioes: prev.regioes.includes(r) ? prev.regioes.filter(v => v !== r) : [...prev.regioes, r] }))} className="w-4 h-4 accent-black border-2 border-black" />
                                                        <span className="text-[10px] font-bold uppercase truncate group-hover:text-[#007D8A]">{r}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Distritos</label>
                                            <div className="max-h-32 overflow-y-auto border-2 border-black bg-white p-2 space-y-1 custom-scrollbar">
                                                {distritosFpolis.map(r => (
                                                    <label key={r} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                                        <input type="checkbox" checked={globalFilters.distritos.includes(r)} onChange={() => setGlobalFilters(prev => ({ ...prev, distritos: prev.distritos.includes(r) ? prev.distritos.filter(v => v !== r) : [...prev.distritos, r] }))} className="w-4 h-4 accent-black border-2 border-black" />
                                                        <span className="text-[10px] font-bold uppercase truncate group-hover:text-[#007D8A]">{r}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Regiões do Estado</label>
                                        <div className="max-h-32 overflow-y-auto border-2 border-black bg-white p-2 space-y-1 custom-scrollbar">
                                            {regioesEstado.map(r => (
                                                <label key={r} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                                    <input type="checkbox" checked={globalFilters.regioes.includes(r)} onChange={() => setGlobalFilters(prev => ({ ...prev, regioes: prev.regioes.includes(r) ? prev.regioes.filter(v => v !== r) : [...prev.regioes, r] }))} className="w-4 h-4 accent-black border-2 border-black" />
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
                                                <input type="checkbox" checked={globalFilters.temas.includes(t)} onChange={() => setGlobalFilters(prev => ({ ...prev, temas: prev.temas.includes(t) ? prev.temas.filter(v => v !== t) : [...prev.temas, t] }))} className="w-4 h-4 accent-black border-2 border-black" />
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
            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden no-print" onClick={() => setIsMobileMenuOpen(false)}></div>}
        </>
    );
};

const SortableBarChart = ({ data, colorClass, valueFormatter = (v) => v, invalidLabel = 'Não Definidos', invalidValue = 0, onLabelClick }) => {
    const [sortDesc, setSortDesc] = useState(true);
    const validData = useMemo(() => data.filter(d => d.value > 0 && !isInvalidData(d.name)), [data]);
    const sortedData = useMemo(() => [...validData].sort((a, b) => sortDesc ? b.value - a.value : a.value - b.value), [validData, sortDesc]);
    const maxVal = validData.length > 0 ? Math.max(...validData.map(d => d.value)) : 1;

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
                                    className={`truncate pr-4 ${onLabelClick ? 'cursor-pointer hover:underline text-[#C1272D]' : ''}`}
                                    onClick={() => onLabelClick && onLabelClick(item.name)}
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
            <div className="mt-4 pt-2 border-t-2 border-dashed border-gray-300 flex flex-wrap justify-end shrink-0 gap-2">
                {invalidValue > 0 && <span className="text-[9px] font-bold text-gray-400 uppercase">{invalidLabel}: {valueFormatter(invalidValue)}</span>}
            </div>
        </div>
    );
};

const DimensionSelect = ({ value, onChange, options }) => (
    <select
        className="ml-2 bg-transparent text-current cursor-pointer outline-none font-black uppercase text-[10px] md:text-xs border-b-2 border-current hover:bg-black/10 transition-colors no-print"
        value={value}
        onChange={(e) => onChange(e.target.value)}
    >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);

const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (typeof aValue === 'string') return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc'; 
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
    };

    return { items: sortedItems, requestSort, sortConfig };
};

const ThSortable = ({ label, sortKey, currentSort, onSort, widthClass="" }) => {
    const isActive = currentSort?.key === sortKey;
    return (
        <th onClick={() => onSort(sortKey)} className={`px-4 py-3 font-black border-r-2 border-black cursor-pointer hover:bg-gray-800 hover:text-white transition-colors select-none ${widthClass}`}>
            <div className="flex items-center justify-between gap-2">
                <span>{label}</span>
                <span className={`text-gray-400 no-print ${isActive ? 'text-yellow-400' : 'opacity-50'}`}>
                    {isActive ? (currentSort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
            </div>
        </th>
    );
};

const DashPanel = ({ title, icon: Icon, colorClass, data, metricType, territoryScope, hasTema = true, onLabelClick, defaultDimCapital = 'bairro', defaultDimInterior = 'municipio' }) => {
    const [dim, setDim] = useState(territoryScope === 'CAPITAL' ? defaultDimCapital : defaultDimInterior);

    const options = [];
    if (territoryScope === 'CAPITAL') {
        // Remove opções que não fazem sentido para Emendas na Capital (pois emenda raramente tem bairro/distrito atrelado)
        if (title !== 'Emendas (R$)') {
            options.push({ value: 'bairro', label: 'Bairro' });
            options.push({ value: 'distrito', label: 'Distrito' });
        }
        options.push({ value: 'regiao', label: 'Região' });
    } else {
        options.push({ value: 'municipio', label: 'Município' });
        options.push({ value: 'regiao', label: 'Região' });
    }
    if (hasTema) options.push({ value: 'tema', label: 'Tema' });

    useEffect(() => {
        if (territoryScope === 'CAPITAL') {
            // Prevenção contra views estilhaçadas. Se dim era municipio e foi pra capital, troca.
            if (dim === 'municipio' || (title === 'Emendas (R$)' && (dim === 'bairro' || dim === 'distrito'))) {
                setDim(defaultDimCapital);
            }
        } else if (territoryScope === 'INTERIOR') {
            if (dim === 'bairro' || dim === 'distrito') {
                setDim(defaultDimInterior);
            }
        }
    }, [territoryScope, title, defaultDimCapital, defaultDimInterior]);

    const aggregated = useMemo(() => {
        const map = {};
        let invalid = 0;
        
        data.forEach(item => {
            const key = dim === 'municipio' ? item.municipio :
                        dim === 'bairro' ? item.bairro :
                        dim === 'distrito' ? item.distrito :
                        dim === 'regiao' ? item.regiao :
                        dim === 'tema' ? item.tema : null;

            const val = metricType === 'sum' ? (item.total || 0) :
                        metricType === 'votos' ? (item.votos || 0) : 1;

            if (isInvalidData(key)) {
                invalid += val;
                return;
            }

            map[key] = (map[key] || 0) + val;
        });

        return {
            chartData: Object.entries(map).map(([name, value]) => ({ name, value })),
            invalid
        };
    }, [data, dim, metricType]);

    return (
        <div className="bg-white border-4 border-black p-4 md:p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col h-[400px]">
            <h3 className="text-base md:text-lg font-black uppercase border-b-4 border-black pb-2 mb-2 shrink-0 flex items-center justify-between">
                <span className="flex items-center gap-2"><Icon /> {title}</span>
                <DimensionSelect value={dim} onChange={setDim} options={options} />
            </h3>
            <SortableBarChart 
                data={aggregated.chartData} 
                colorClass={colorClass} 
                valueFormatter={metricType === 'sum' ? formatCurrency : (v) => v.toLocaleString()} 
                invalidValue={aggregated.invalid} 
                invalidLabel="Não Informado" 
                onLabelClick={(t) => onLabelClick(dim, t)} 
            />
        </div>
    );
};

const Dashboard = () => {
    const { leads, emendas, agenda, contatos, estado, capital, territoryScope, includeFloripa, setSelectedEntity } = useContext(AppContext);

    const handleLabelClick = (dim, val) => setSelectedEntity({ type: dim, name: val });

    const votosData = useMemo(() => {
        let arr = [];
        if (territoryScope !== 'CAPITAL') {
            arr = arr.concat(estado.map(e => ({ municipio: e.municipio, regiao: e.regiao, votos: e.Votos2022 })));
        }
        if (territoryScope === 'CAPITAL' || includeFloripa) {
            arr = arr.concat(capital.map(c => ({ municipio: 'Florianópolis', bairro: c.bairro, distrito: c.distrito, regiao: c.regiao, votos: territoryScope === 'CAPITAL' ? c.Votos2024 : c.Votos2022 })));
        }
        return arr;
    }, [estado, capital, territoryScope, includeFloripa]);

    return (
        <div className="space-y-6 md:space-y-8 w-full max-w-6xl mx-auto pb-12 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-4">
                <DashPanel title="Votos" icon={Icons.MapPin} data={votosData} metricType="votos" hasTema={false} territoryScope={territoryScope} colorClass="bg-[#C1272D]" onLabelClick={handleLabelClick} defaultDimCapital="bairro" defaultDimInterior="municipio" />
                <DashPanel title="Emendas (R$)" icon={Icons.FileText} data={emendas} metricType="sum" hasTema={true} territoryScope={territoryScope} colorClass="bg-[#EAA221]" onLabelClick={handleLabelClick} defaultDimCapital="tema" defaultDimInterior="municipio" />
                <DashPanel title="Agenda" icon={Icons.Calendar} data={agenda} metricType="count" hasTema={false} territoryScope={territoryScope} colorClass="bg-[#007D8A]" onLabelClick={handleLabelClick} defaultDimCapital="regiao" defaultDimInterior="municipio" />
                <DashPanel title="Lideranças" icon={Icons.Briefcase} data={contatos} metricType="count" hasTema={true} territoryScope={territoryScope} colorClass="bg-[#C1272D]" onLabelClick={handleLabelClick} defaultDimCapital="bairro" defaultDimInterior="municipio" />
                <div className="lg:col-span-2">
                    <DashPanel title="Leads (Eventos)" icon={Icons.Users} data={leads} metricType="count" hasTema={true} territoryScope={territoryScope} colorClass="bg-black" onLabelClick={handleLabelClick} defaultDimCapital="bairro" defaultDimInterior="municipio" />
                </div>
            </div>
        </div>
    );
};

const ListaMunicipios = () => {
    const { estado, emendas, contatos, leads, setSelectedEntity, includeFloripa } = useContext(AppContext);

    const dadosAgregados = useMemo(() => {
        const munisMap = {};
        
        estado.forEach(e => {
            const m = normalizeStr(e.municipio);
            if (isInvalidData(m)) return;
            if (!munisMap[m]) munisMap[m] = { municipio: e.municipio, regiao: e.regiao || '-', votos18: 0, votos22: 0, volEmendas: 0, numContatos: 0, numLeads: 0 };
            munisMap[m].votos18 += e.Votos2018 || 0;
            munisMap[m].votos22 += e.Votos2022 || 0;
        });

        emendas.forEach(e => {
            const m = normalizeStr(e.municipio);
            if (isInvalidData(m)) return;
            if (!munisMap[m]) munisMap[m] = { municipio: e.municipio, regiao: e.regiao || '-', votos18: 0, votos22: 0, volEmendas: 0, numContatos: 0, numLeads: 0 };
            munisMap[m].volEmendas += e.total || 0;
        });
        
        contatos.filter(c => c.base.includes('Santa Catarina')).forEach(c => {
            const m = normalizeStr(c.municipio);
            if (isInvalidData(m)) return;
            if (!munisMap[m]) munisMap[m] = { municipio: c.municipio, regiao: c.regiao || '-', votos18: 0, votos22: 0, volEmendas: 0, numContatos: 0, numLeads: 0 };
            munisMap[m].numContatos += 1;
        });

        leads.filter(l => !isFloripa(l.municipio)).forEach(l => {
            const m = normalizeStr(l.municipio);
            if (isInvalidData(m)) return;
            if (munisMap[m]) munisMap[m].numLeads += 1;
        });

        return Object.values(munisMap).filter(m => isFloripa(m.municipio) ? includeFloripa : true);
    }, [estado, emendas, contatos, leads, includeFloripa]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados, { key: 'votos22', direction: 'desc' });

    const handleCsv = () => {
        const rows = [
            ["Município", "Região", "Votos '18", "Votos '22", "Lideranças", "Leads", "Emendas (R$)"],
            ...items.map(m => [m.municipio, m.regiao, m.votos18, m.votos22, m.numContatos, m.numLeads, m.volEmendas.toFixed(2).replace('.', ',')])
        ];
        exportToCSV("RaioX_Estado", rows);
    };

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <ExportToolbar onCsv={handleCsv} onPdf={() => window.print()} />
            <div className="bg-white border-4 border-black print-table-container overflow-x-auto shadow-[6px_6px_0px_0px_#111111]">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-[#111111] text-white border-b-4 border-black text-xs uppercase">
                        <tr>
                            <ThSortable label="Município" sortKey="municipio" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/4" />
                            <ThSortable label="Região" sortKey="regiao" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos '18" sortKey="votos18" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos '22" sortKey="votos22" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Lideranças" sortKey="numContatos" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Leads" sortKey="numLeads" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Emendas (R$)" sortKey="volEmendas" currentSort={sortConfig} onSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((m, i) => (
                            <tr key={i} className="border-b-2 border-gray-200 hover:bg-[#EAA221]/20 transition-colors">
                                <td onClick={() => setSelectedEntity({ type: 'municipio', name: m.municipio })} className="px-4 py-3 border-r-2 border-gray-200 font-black text-sm uppercase cursor-pointer hover:underline text-[#111]">{m.municipio}</td>
                                <td onClick={() => setSelectedEntity({ type: 'regiao', name: m.regiao })} className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:underline">{m.regiao}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-bold text-gray-400 text-right">{m.votos18.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-[#C1272D] text-right">{m.votos22.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-center">{m.numContatos}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-bold text-gray-500 text-center">{m.numLeads}</td>
                                <td className="px-4 py-3 font-black text-[#007D8A] text-right">{formatCurrency(m.volEmendas)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ListaCapital = () => {
    const { capital, contatos, leads, setSelectedEntity } = useContext(AppContext);

    const dadosAgregados = useMemo(() => {
        const bairrosMap = {};
        capital.forEach(c => {
            const b = normalizeStr(c.bairro);
            if (isInvalidData(b)) return;
            if (!bairrosMap[b]) bairrosMap[b] = { bairro: c.bairro, distrito: c.distrito || '-', regiao: c.regiao || '-', votos22: 0, votos24: 0, numContatos: 0, numLeads: 0 };
            bairrosMap[b].votos22 += c.Votos2022 || 0;
            bairrosMap[b].votos24 += c.Votos2024 || 0;
        });

        contatos.filter(c => c.base.includes('Florianópolis')).forEach(c => {
            const b = normalizeStr(c.bairro);
            if (isInvalidData(b)) return;
            if (!bairrosMap[b]) bairrosMap[b] = { bairro: c.bairro, distrito: c.distrito || '-', regiao: c.regiao || '-', votos22: 0, votos24: 0, numContatos: 0, numLeads: 0 };
            bairrosMap[b].numContatos += 1;
        });

        leads.filter(l => isFloripa(l.municipio)).forEach(l => {
            const b = normalizeStr(l.bairro);
            if (isInvalidData(b)) return;
            if (bairrosMap[b]) bairrosMap[b].numLeads += 1;
        });

        return Object.values(bairrosMap);
    }, [capital, contatos, leads]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados, { key: 'votos24', direction: 'desc' });

    const handleCsv = () => {
        const rows = [
            ["Bairro", "Distrito", "Região", "Votos '22", "Votos '24", "Lideranças", "Leads"],
            ...items.map(b => [b.bairro, b.distrito, b.regiao, b.votos22, b.votos24, b.numContatos, b.numLeads])
        ];
        exportToCSV("RaioX_Capital", rows);
    };

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <ExportToolbar onCsv={handleCsv} onPdf={() => window.print()} />
            <div className="bg-white border-4 border-black print-table-container overflow-x-auto shadow-[6px_6px_0px_0px_#111111]">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-[#111111] text-white border-b-4 border-black text-xs uppercase">
                        <tr>
                            <ThSortable label="Bairro" sortKey="bairro" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/4" />
                            <ThSortable label="Distrito" sortKey="distrito" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Região" sortKey="regiao" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos '22" sortKey="votos22" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos '24" sortKey="votos24" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Lideranças" sortKey="numContatos" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Leads" sortKey="numLeads" currentSort={sortConfig} onSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((b, i) => (
                            <tr key={i} className="border-b-2 border-gray-200 hover:bg-[#007D8A]/20 transition-colors">
                                <td onClick={() => setSelectedEntity({ type: 'bairro', name: b.bairro })} className="px-4 py-3 border-r-2 border-gray-200 font-black text-sm uppercase cursor-pointer hover:underline text-[#111]">{b.bairro}</td>
                                <td onClick={() => setSelectedEntity({ type: 'distrito', name: b.distrito })} className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:underline">{b.distrito}</td>
                                <td onClick={() => setSelectedEntity({ type: 'regiao', name: b.regiao })} className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:underline">{b.regiao}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-bold text-gray-400 text-right">{b.votos22.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-[#007D8A] text-right">{b.votos24.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-center">{b.numContatos}</td>
                                <td className="px-4 py-3 font-bold text-gray-500 text-center">{b.numLeads}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ListaInstituicoes = () => {
    const { emendas, setSelectedEntity } = useContext(AppContext);

    const dadosAgregados = useMemo(() => {
        const instMap = {};
        let outros = { nome: 'Entidades Não Informadas', isPublic: false, total: 0, qty: 0, municipios: new Set() };
        
        emendas.forEach(e => {
            const r = normalizeStr(e.razaoSocial);
            if (isInvalidData(r) || r.includes('entidades nao informadas')) {
                outros.total += e.total;
                outros.qty += 1;
                outros.municipios.add(e.municipio);
                return;
            }
            if (!instMap[r]) instMap[r] = { nome: e.razaoSocial, isPublic: isPublicInstitution(r), total: 0, qty: 0, municipios: new Set() };
            instMap[r].total += e.total;
            instMap[r].qty += 1;
            instMap[r].municipios.add(e.municipio);
        });

        return {
            main: Object.values(instMap).map(i => ({ ...i, locs: Array.from(i.municipios).join(', ') })),
            outros: { ...outros, locs: Array.from(outros.municipios).join(', ') }
        };
    }, [emendas]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados.main, { key: 'total', direction: 'desc' });

    const handleCsv = () => {
        const rows = [
            ["Instituição / Razão Social", "Municípios Atendidos", "Ocorrências", "Total Destinado (R$)"],
            ...items.map(m => [m.nome, m.locs, m.qty, m.total.toFixed(2).replace('.', ',')])
        ];
        if (dadosAgregados.outros.qty > 0) {
            rows.push([dadosAgregados.outros.nome, dadosAgregados.outros.locs, dadosAgregados.outros.qty, dadosAgregados.outros.total.toFixed(2).replace('.', ',')]);
        }
        exportToCSV("RaioX_Instituicoes", rows);
    };

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <ExportToolbar onCsv={handleCsv} onPdf={() => window.print()} />
            <div className="bg-white border-4 border-black print-table-container overflow-x-auto shadow-[6px_6px_0px_0px_#111111]">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-[#111111] text-white border-b-4 border-black text-xs uppercase">
                        <tr>
                            <ThSortable label="Instituição / Razão Social" sortKey="nome" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/3" />
                            <ThSortable label="Municípios Atendidos" sortKey="locs" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/3" />
                            <ThSortable label="Ocorrências" sortKey="qty" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Total Destinado (R$)" sortKey="total" currentSort={sortConfig} onSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((m, i) => (
                            <tr key={i} onClick={() => setSelectedEntity({ type: 'instituicao', name: m.nome })} className={`border-b-2 border-gray-200 cursor-pointer transition-colors ${m.isPublic ? 'hover:bg-[#C1272D]/10' : 'hover:bg-[#EAA221]/10'}`}>
                                <td className="px-4 py-3 border-r-2 border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 border border-black shrink-0 ${m.isPublic ? 'bg-[#C1272D]' : 'bg-[#EAA221]'}`}></div>
                                        <span className="font-black text-sm uppercase text-[#111] leading-tight">{m.nome}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase truncate max-w-[200px]">{m.locs}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-center">{m.qty}</td>
                                <td className="px-4 py-3 font-black text-[#007D8A] text-right">{formatCurrency(m.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {dadosAgregados.outros.qty > 0 && (
                <div className="p-4 bg-gray-100 border-2 border-dashed border-gray-400 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors shadow-sm no-print" onClick={() => setSelectedEntity({ type: 'instituicao', name: 'Entidades Não Informadas' })}>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-400 border border-black"></div>
                        <div>
                            <span className="font-bold text-xs uppercase text-gray-500 block leading-tight">Outros / Entidades Não Informadas</span>
                            <span className="text-[10px] font-bold text-gray-400 block mt-0.5">{dadosAgregados.outros.qty} Ocorrências</span>
                        </div>
                    </div>
                    <div className="font-black text-gray-500">{formatCurrency(dadosAgregados.outros.total)}</div>
                </div>
            )}
        </div>
    );
};

const SistemaTabulum = () => (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-12 animate-fade-in no-print">
        <div className="bg-black text-white p-8 border-4 border-black shadow-[8px_8px_0_0_rgba(17,17,17,1)]">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">SISTEMA TABULUM</h1>
            <p className="text-xs md:text-sm font-bold text-gray-300 uppercase tracking-widest">Aplicativos para gestão da informação do mandato de Marquito.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <a href="https://tabulum-sig-monilegis.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-[#C1272D]">Monitor Legislativo (MoniLegis)</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Monitora as páginas da ALESC pelos Processos Legislativos e Atividades Parlamentares do deputado Marquito.</p>
            </a>
            <a href="https://tabulum-mapel.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-[#EAA221]">Mapa Eleitoral (MapEl)</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Sistematiza o histórico de votações de Marquito, tanto em Florianópolis como por Santa Catarina.</p>
            </a>
            <a href="https://tabulum-gestagen.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-[#007D8A]">Gestão de Agenda</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Vinculada com o Google Calendar do mandato, sistematiza a agenda do deputado.</p>
            </a>
            <a href="https://tabulum-leads.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-black">Leads</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Gestão e análise dos Leads captados em eventos do mandato. Protegido por senha pois contém muitos dados sensíveis.</p>
            </a>
        </div>
    </div>
);

const FichaCompleta = () => {
    const { selectedEntity, setSelectedEntity, rawLeads: leads, rawContatos: contatos, rawEmendas: emendas, rawAgenda: agenda, rawEstado: estado, rawCapital: capital } = useContext(AppContext);
    
    const entityData = useMemo(() => {
        const { type, name } = selectedEntity;
        const n = normalizeStr(name);
        
        let relLeads = [], relContatos = [], relEmendas = [], relAgendas = [], relVotos = null;
        const matchStr = (val) => normalizeStr(val) === n;

        if (type === 'municipio') {
            relLeads = leads.filter(l => matchStr(l.municipio));
            relContatos = contatos.filter(c => c.base.includes('Santa Catarina') && matchStr(c.municipio));
            relEmendas = emendas.filter(e => matchStr(e.municipio));
            relAgendas = agenda.filter(a => matchStr(a.municipio));
            const v = estado.find(r => matchStr(r.municipio));
            if (v) relVotos = { type: 'Estado (SC)', vAntigo: v.Votos2018, vNovo: v.Votos2022, labelA: '2018', labelN: '2022', regiao: v.regiao };
        } 
        else if (type === 'bairro') {
            relLeads = leads.filter(l => isFloripa(l.municipio) && matchStr(l.bairro));
            relContatos = contatos.filter(c => c.base.includes('Florianópolis') && matchStr(c.bairro));
            relAgendas = agenda.filter(a => isFloripa(a.municipio) && matchStr(a.bairro));
            const vArr = capital.filter(r => matchStr(r.bairro));
            if (vArr.length > 0) {
                const tot22 = vArr.reduce((acc, curr) => acc + curr.Votos2022, 0);
                const tot24 = vArr.reduce((acc, curr) => acc + curr.Votos2024, 0);
                relVotos = { type: 'Capital (Bairro)', vAntigo: tot22, vNovo: tot24, labelA: '2022', labelN: '2024', regiao: vArr[0].regiao };
            }
        }
        else if (type === 'regiao') {
            relContatos = contatos.filter(c => matchStr(c.regiao));
            relEmendas = emendas.filter(e => matchStr(e.regiao));
        }
        else if (type === 'distrito') {
            relContatos = contatos.filter(c => matchStr(c.distrito));
            const vArr = capital.filter(r => matchStr(r.distrito));
            if (vArr.length > 0) {
                const tot22 = vArr.reduce((acc, curr) => acc + curr.Votos2022, 0);
                const tot24 = vArr.reduce((acc, curr) => acc + curr.Votos2024, 0);
                relVotos = { type: 'Capital (Distrito)', vAntigo: tot22, vNovo: tot24, labelA: '2022', labelN: '2024', regiao: vArr[0].regiao };
            }
        }
        else if (type === 'articulador') {
            relContatos = contatos.filter(c => matchStr(c.articulador));
            relEmendas = emendas.filter(e => matchStr(e.articulador));
            relAgendas = agenda.filter(a => matchStr(a.articulador));
        }
        else if (type === 'tema') {
            relContatos = contatos.filter(c => matchStr(c.tema));
            relEmendas = emendas.filter(e => matchStr(e.tema));
            relLeads = leads.filter(l => matchStr(l.tema));
        }
        else if (type === 'instituicao') {
            if (n.includes('entidades nao informadas')) relEmendas = emendas.filter(e => isInvalidData(e.razaoSocial) || normalizeStr(e.razaoSocial).includes('entidades nao informadas'));
            else relEmendas = emendas.filter(e => matchStr(e.razaoSocial));
        }

        return { leads: relLeads, contatos: relContatos, emendas: relEmendas, agendas: relAgendas, votos: relVotos };
    }, [selectedEntity, leads, contatos, emendas, agenda, estado, capital]);

    const valTotal = entityData.emendas.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="space-y-6 w-full max-w-6xl mx-auto pb-12 animate-fade-in">
            <button onClick={() => setSelectedEntity(null)} className="no-print bg-black text-white px-4 py-2 font-black uppercase text-[10px] border-4 border-black hover:bg-gray-800 flex items-center w-fit shadow-[4px_4px_0_0_rgba(17,17,17,1)] active:translate-y-1 active:shadow-none">
                &larr; Voltar
            </button>
            <div className="bg-white p-6 md:p-8 border-4 border-black shadow-[8px_8px_0_0_rgba(17,17,17,1)] relative overflow-hidden print-table-container">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#111] border-l-4 border-b-4 border-black no-print"></div>
                <span className="inline-block px-3 py-1 bg-[#EAA221] text-black text-[10px] font-black uppercase tracking-widest border-2 border-black mb-4">
                    Ficha Analítica: {selectedEntity.type}
                </span>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-black uppercase tracking-tighter leading-none pr-10 break-words">{selectedEntity.name}</h1>
                
                {entityData.votos && (
                    <div className="mt-6 flex flex-wrap gap-4 md:gap-6 pt-4 border-t-2 border-dashed border-gray-300">
                        <div className="flex items-end gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-gray-500">Votos ({entityData.votos.labelA})</span>
                                <span className="text-xl md:text-2xl font-bold text-gray-400">{entityData.votos.vAntigo.toLocaleString()}</span>
                            </div>
                            <div className="text-gray-400 font-bold mb-1">&rarr;</div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-black">Votos ({entityData.votos.labelN})</span>
                                <span className="text-2xl md:text-3xl font-black text-[#C1272D]">{entityData.votos.vNovo.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] print-table-container flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#C1272D] text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center text-sm"><Icons.Briefcase/><span className="ml-2">Lideranças Estratégicas</span></h3>
                        <span className="font-black text-sm bg-black border-2 border-white px-2">{entityData.contatos.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] p-2 space-y-2 custom-scrollbar">
                        {entityData.contatos.length > 0 ? entityData.contatos.map((c, i) => (
                             <div key={i} className="border-b-2 border-gray-200 pb-2 mb-2">
                                <div className="font-black uppercase leading-tight">{c.nome}</div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase">Artic: {c.articulador || '-'}</div>
                             </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] print-table-container flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#EAA221] border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center text-sm"><Icons.FileText/><span className="ml-2">Emendas (Total: {formatCurrency(valTotal)})</span></h3>
                        <span className="font-black text-sm bg-white border-2 border-black px-2">{entityData.emendas.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] p-2 space-y-2 custom-scrollbar">
                        {entityData.emendas.length > 0 ? entityData.emendas.map((e, i) => (
                            <div key={i} className="border-2 border-black p-2 bg-white">
                                <div className="font-black text-sm uppercase leading-tight mb-1">{e.objeto}</div>
                                <span className="font-black text-xs text-[#007D8A]">{formatCurrency(e.total)}</span>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

const GlobalStats = () => {
    const { leads, emendas, agenda, contatos, estado, capital, territoryScope, includeFloripa, mainView } = useContext(AppContext);

    if (mainView === 'sistema') return null;

    const statsVotos = useMemo(() => {
        let vAntigo = 0, vNovo = 0;
        const currentScope = mainView === 'lista_floripa' ? 'CAPITAL' : mainView === 'lista_sc' ? 'INTERIOR' : territoryScope;
        
        if (currentScope !== 'CAPITAL') {
            estado.forEach(e => { vAntigo += e.Votos2018; vNovo += e.Votos2022; });
        }
        
        if (currentScope === 'CAPITAL' || (currentScope === 'INTERIOR' && includeFloripa)) {
            capital.forEach(c => {
                if (currentScope === 'CAPITAL') { vAntigo += c.Votos2022; vNovo += c.Votos2024; }
                else { vNovo += c.Votos2022; }
            });
        }
        return { vAntigo, vNovo, lblAntigo: currentScope === 'CAPITAL' ? '2022' : '2018', lblNovo: currentScope === 'CAPITAL' ? '2024' : '2022' };
    }, [estado, capital, territoryScope, includeFloripa, mainView]);

    const isFiltroCapital = mainView === 'lista_floripa' || territoryScope === 'CAPITAL';

    return (
        <div className="space-y-4 md:space-y-6 mb-6 no-print">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                <div className={`col-span-2 lg:col-span-1 border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between ${isFiltroCapital ? 'bg-[#007D8A] text-white' : 'bg-[#EAA221] text-black'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isFiltroCapital ? 'opacity-80' : 'opacity-70'}`}>Evolução ({isFiltroCapital ? 'Capital' : 'SC'})</span>
                    </div>
                    <div className="flex items-end gap-1 sm:gap-2">
                        <div className="flex flex-col"><span className="text-[9px] font-bold opacity-80">{statsVotos.lblAntigo}</span><span className="text-lg sm:text-xl font-black">{statsVotos.vAntigo.toLocaleString()}</span></div>
                        <div className="text-sm font-black opacity-50 mb-0.5">&rarr;</div>
                        <div className="flex flex-col"><span className={`text-[9px] font-black px-1 border border-current w-fit mb-0.5 ${isFiltroCapital ? 'bg-white text-[#007D8A]' : 'bg-black text-[#EAA221]'}`}>{statsVotos.lblNovo}</span><span className="text-xl sm:text-2xl font-black">{statsVotos.vNovo.toLocaleString()}</span></div>
                    </div>
                </div>
                <div className="bg-white border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Briefcase /><span className="ml-1">Lideranças</span></h3>
                    <div className="text-2xl sm:text-3xl font-black text-[#C1272D]">{contatos.length}</div>
                    <div className="h-1.5 w-full bg-black mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Users /><span className="ml-1">Leads</span></h3>
                    <div className="text-2xl sm:text-3xl font-black">{leads.length}</div>
                    <div className="h-1.5 w-full bg-[#007D8A] mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between overflow-hidden">
                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.FileText /><span className="ml-1">Emendas</span></h3>
                    <div className="text-xl sm:text-2xl font-black truncate">{formatCurrency(emendas.reduce((acc, curr) => acc + curr.total, 0))}</div>
                    <div className="h-1.5 w-full bg-[#EAA221] mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Calendar /><span className="ml-1">Agendas Totais</span></h3>
                    <div className="text-2xl sm:text-3xl font-black">{agenda.length}</div>
                    <div className="h-1.5 w-full bg-[#C1272D] mt-2 border border-black"></div>
                </div>
            </div>
        </div>
    )
}

const AppContent = () => {
    const { loadingInfo, selectedEntity, mainView, setMainView } = useContext(AppContext);

    if (loadingInfo.isLoading) return <LoadingScreen loadingInfo={loadingInfo} />;

    return (
        <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#FDFBF7] text-[#111111] font-sans relative">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden relative print-main">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none no-print" style={{ backgroundImage: 'radial-gradient(#111 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
                
                {!selectedEntity && (
                    <div className="flex border-b-4 border-black bg-white z-10 shadow-sm shrink-0 overflow-x-auto custom-scrollbar no-print">
                        <button onClick={() => setMainView('dashboard')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-r-4 border-black transition-colors whitespace-nowrap ${mainView === 'dashboard' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Painel Analítico</button>
                        <button onClick={() => setMainView('lista_sc')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-r-4 border-black transition-colors whitespace-nowrap ${mainView === 'lista_sc' ? 'bg-[#EAA221] text-black' : 'hover:bg-gray-100'}`}>Raio-X: Estado</button>
                        <button onClick={() => setMainView('lista_floripa')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-r-4 border-black transition-colors whitespace-nowrap ${mainView === 'lista_floripa' ? 'bg-[#007D8A] text-white' : 'hover:bg-gray-100'}`}>Raio-X: Capital</button>
                        <button onClick={() => setMainView('lista_instituicoes')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest transition-colors whitespace-nowrap ${mainView === 'lista_instituicoes' ? 'bg-[#C1272D] text-white' : 'hover:bg-gray-100'}`}>Raio-X: Instituições</button>
                        <button onClick={() => setMainView('sistema')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-l-4 border-black transition-colors whitespace-nowrap ml-auto ${mainView === 'sistema' ? 'bg-black text-white' : 'bg-gray-200 hover:bg-gray-300 text-black'}`}>Outros Apps</button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative z-10 custom-scrollbar print-main">
                    {selectedEntity ? <FichaCompleta /> : (
                        <>
                            <GlobalStats />
                            {mainView === 'dashboard' ? <Dashboard /> :
                             mainView === 'lista_sc' ? <ListaMunicipios /> :
                             mainView === 'lista_instituicoes' ? <ListaInstituicoes /> :
                             mainView === 'sistema' ? <SistemaTabulum /> :
                             <ListaCapital />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default function App() {
    return (
        <AppProvider>
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px;}
                .custom-scrollbar::-webkit-scrollbar-track { background: #FDFBF7; border-left: 2px solid #111; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; }
                * { scrollbar-color: #111 #FDFBF7; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-table-container { box-shadow: none !important; border: 2px solid black !important; }
                    .print-main { overflow: visible !important; height: auto !important; position: static !important; }
                    .custom-scrollbar { overflow: visible !important; }
                    .flex-1 { display: block !important; width: 100% !important; }
                    .h-screen { height: auto !important; }
                    .w-full { width: 100% !important; }
                    table { font-size: 10px !important; width: 100% !important; min-width: 100% !important; }
                    th, td { padding: 4px !important; }
                }
            `}} />
            <AppContent />
        </AppProvider>
    );
}
