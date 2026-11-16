require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const MeuTokenJWT = require("./http/MeuTokenJWT");

const ErrorResponse = require("./utils/ErrorResponse");
const MysqlDatabase = require("./database/MysqlDatabase");


/* ================= DAO ================= */
const AlunoDAO = require("./dao/AlunoDAO");
const CursoDAO = require("./dao/CursoDAO");
const ProfessorDAO = require("./dao/ProfessorDAO");
const DisciplinaDAO = require("./dao/DisciplinaDAO");
const TurmaDAO = require("./dao/TurmaDAO");
const NotaDAO = require("./dao/NotaDAO");
const AlunoDisciplinaProfessorDAO = require("./dao/AlunoDisciplinaProfessorDAO");
const HistoricoCoordenadorDAO = require("./dao/HistoricoCoordenadorDAO");
const ContestacaoDAO = require("./dao/ContestacaoDAO");
const ConfiguracaoNotasDAO = require("./dao/ConfiguracaoNotasDAO");
const SolicitacaoTransferenciaDAO = require("./dao/SolicitacaoTransferenciaDAO");
const SolicitacaoProfessorDAO = require("./dao/SolicitacaoProfessorDAO");
const ProfessorCursoDAO = require("./dao/Professorcursodao");
const TravaNotasDAO = require("./dao/TravaNotasDAO");


/* ================= SERVICE ================= */

const AlunoService = require("./service/AlunoService");
const CursoService = require("./service/CursoService");
const ProfessorService = require("./service/ProfessorService");
const DisciplinaService = require("./service/DisciplinaService");
const TurmaService = require("./service/TurmaService");
const NotaService = require("./service/NotaService");
const AlunoDisciplinaProfessorService = require("./service/AlunoDisciplinaProfessorService");
const HistoricoCoordenadorService = require("./service/HistoricoCoordenadorService");
const ContestacaoService = require("./service/ContestacaoService");
const ConfiguracaoNotasService = require("./service/ConfiguracaoNotasService");
const SolicitacaoTransferenciaService = require("./service/SolicitacaoTransferenciaService");
const SolicitacaoProfessorService = require("./service/SolicitacaoProfessorService");


/* ================= CONTROL ================= */

const AlunoControl = require("./control/AlunoControl");
const CursoControl = require("./control/CursoControl");
const ProfessorControl = require("./control/ProfessorControl");
const DisciplinaControl = require("./control/DisciplinaControl");
const TurmaControl = require("./control/TurmaControl");
const NotaControl = require("./control/NotaControl");
const AlunoDisciplinaProfessorControl = require("./control/AlunoDisciplinaProfessorControl");
const HistoricoCoordenadorControl = require("./control/HistoricoCoordenadorControl");
const ContestacaoControl = require("./control/ContestacaoControl");
const ConfiguracaoNotasControl = require("./control/ConfiguracaoNotasControl");
const SolicitacaoTransferenciaControl = require("./control/SolicitacaoTransferenciaControl");
const SolicitacaoProfessorControl = require("./control/SolicitacaoProfessorControl");


/* ================= ROUTER ================= */

const AlunoRoteador = require("./router/AlunoRoteador");
const CursoRoteador = require("./router/CursoRoteador");
const ProfessorRoteador = require("./router/ProfessorRoteador");
const DisciplinaRoteador = require("./router/DisciplinaRoteador");
const TurmaRoteador = require("./router/TurmaRoteador");
const NotaRoteador = require("./router/NotaRoteador");
const AlunoDisciplinaProfessorRoteador = require("./router/AlunoDisciplinaProfessorRoteador");
const HistoricoCoordenadorRoteador = require("./router/HistoricoCoordenadorRoteador");
const ContestacaoRoteador = require("./router/ContestacaoRoteador");
const ConfiguracaoNotasRoteador = require("./router/ConfiguracaoNotasRoteador");
const SolicitacaoTransferenciaRoteador = require("./router/SolicitacaoTransferenciaRoteador");
const SolicitacaoProfessorRoteador = require("./router/SolicitacaoProfessorRoteador");


/* ================= MIDDLEWARE ================= */

const JwtMiddleware = require("./middleware/JwtMiddleware");
const AlunoMiddleware = require("./middleware/AlunoMiddleware");
const CursoMiddleware = require("./middleware/CursoMiddleware");
const ProfessorMiddleware = require("./middleware/ProfessorMiddleware");
const DisciplinaMiddleware = require("./middleware/DisciplinaMiddleware");
const TurmaMiddleware = require("./middleware/TurmaMiddleware");
const NotaMiddleware = require("./middleware/NotaMiddleware");
const AlunoDisciplinaProfessorMiddleware = require("./middleware/AlunoDisciplinaProfessorMiddleware");
const BloqueioNotasMiddleware = require("./middleware/BloqueioNotasMiddleware");


/* =========================================================
   SERVER
========================================================= */

module.exports = class Server {

    #porta;
    #app;
    #database;
    #jwtMiddleware;


    constructor(porta) {

        console.log("✅ Server.constructor()");

        this.#porta = porta ?? 3000;

        this.#jwtMiddleware = new JwtMiddleware();
    }


    /* =====================================================
       INIT
    ===================================================== */

    init = async () => {

        console.log("✅ Server.init()");

        this.#app = express();

        console.log("✅ server.js segurança v1");

        /* não revela que o servidor é Express */
        this.#app.disable("x-powered-by");

        /* cabeçalhos de segurança (CSP desligado de propósito: o front
           usa scripts inline e CDNs; ligar exige ajustar o HTML antes) */
        this.#app.use(helmet({ contentSecurityPolicy: false }));

        this.#app.use(express.json());


        /* =================================================
           ERROS 5xx NUNCA VÃO AO NAVEGADOR
           Mensagens de banco/código ficam só no console do
           servidor. Erros 4xx (regras de negócio) passam.
        ================================================= */

        this.#app.use("/api", (req, res, next) => {

            const jsonOriginal = res.json.bind(res);

            res.json = corpo => {

                if (res.statusCode >= 500 && corpo && typeof corpo === "object") {

                    console.error(
                        "❌ Erro interno ocultado do cliente:",
                        req.method,
                        req.originalUrl,
                        corpo
                    );

                    return jsonOriginal({
                        error: "Erro interno no servidor. Tente novamente."
                    });
                }

                return jsonOriginal(corpo);
            };

            next();
        });


        /* =================================================
           LIMITE DE TENTATIVAS DE LOGIN
           Conta só as tentativas que FALHAM, por conta
           (matrícula/registro) + IP: 10 erros em 15 minutos
           bloqueiam aquela conta naquele IP. Uma sala inteira
           no mesmo IP não se bloqueia entre si.
        ================================================= */

        const limiteLogin = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 10,
            skipSuccessfulRequests: true,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                const conta = String(req.body?.matricula ?? req.body?.registro ?? "");
                const ip = typeof ipKeyGenerator === "function"
                    ? ipKeyGenerator(req.ip)
                    : req.ip;
                return `${ip}|${conta}`;
            },
            message: {
                error: "Muitas tentativas de login. Aguarde alguns minutos e tente de novo."
            }
        });

        this.#app.use("/api/v1/alunos/login", limiteLogin);
        this.#app.use("/api/v1/professores/login", limiteLogin);

        this.#app.use(cookieParser());

        this.#app.use(
            ["/api/v1/alunos/login", "/api/v1/professores/login"],
            (req, res, next) => {

                const jsonOriginal = res.json.bind(res);

                res.json = corpo => {

                    if (res.statusCode < 400 && corpo?.token) {
                        res.cookie("gata_sessao", corpo.token, {
                            httpOnly: true,
                            sameSite: "strict",
                            secure: process.env.NODE_ENV === "production"
                        });
                    }

                    return jsonOriginal(corpo);
                };

                next();
            }
        );


        const frontendPath = path.join(__dirname, "public");
        const privadoPath = path.join(__dirname, "privado");

        /* quem pode abrir cada coisa (confira os valores de role no seu token) */
        const ehAluno = p => p?.role === "aluno";
        const ehProfessor = p => p?.role === "professor";
        const ehCoordenador = p =>
            p?.role === "professor" && (p.coordenador === true || p.coordenador === 1);

        const lerSessao = req => {

            const token = req.cookies?.gata_sessao;

            if (!token) return null;

            const jwt = new MeuTokenJWT();

            return jwt.validarToken(token) === true ? jwt.payload : null;
        };

        const servirPrivado = (arquivo, permitido, ehPagina) => (req, res) => {

            if (!permitido(lerSessao(req))) {
                return ehPagina ? res.redirect("/login") : res.status(403).end();
            }

            res.setHeader("Cache-Control", "no-store");
            res.sendFile(path.join(privadoPath, arquivo));
        };

        /* URLs antigas com .html só mandam para o login (vem ANTES do static) */
        this.#app.get(
            ["/paginaLogin.html", "/aluno.html", "/professor.html", "/coordenador.html"],
            (req, res) => res.redirect("/login")
        );

        /* páginas */
        this.#app.get("/aluno", servirPrivado("aluno.html", ehAluno, true));
        this.#app.get("/professor", servirPrivado("professor.html", ehProfessor, true));
        this.#app.get("/coordenador", servirPrivado("coordenador.html", ehCoordenador, true));

        /* scripts e estilos das telas (inclua aqui qualquer arquivo extra) */
        const ARQUIVOS_PRIVADOS = new Map([
            ["aluno.js", ehAluno],
            ["professor.js", ehProfessor],
            ["coordenador.js", ehCoordenador],
            ["coordenador.css", ehCoordenador]
        ]);

        for (const [arquivo, permitido] of ARQUIVOS_PRIVADOS) {
            this.#app.get("/" + arquivo, servirPrivado(arquivo, permitido, false));
        }

        this.#app.use(express.static(frontendPath));

        /* login (visitar o login também encerra a sessão das páginas) */
        this.#app.get("/login", (req, res) => {
            res.clearCookie("gata_sessao");
            res.sendFile(path.join(frontendPath, "paginaLogin.html"));
        });


        /* =================================================
           BANCO
        ================================================= */

        this.#database = new MysqlDatabase();

        await this.#database.connect();


        /* =================================================
           ROUTES
        ================================================= */

        await this.setupAluno();
        await this.setupCurso();
        await this.setupProfessor();
        await this.setupDisciplina();
        await this.setupTurma();
        await this.setupNota();
        await this.setupConfiguracaoNotas();
        await this.setupSolicitacaoTransferencia();
        await this.setupSolicitacaoProfessor();
        await this.setupAlunoDisciplinaProfessor();
        await this.setupHistoricoCoordenador();
        await this.setupContestacao();


        /* =================================================
           MIDDLEWARE GLOBAL DE ERRO
        ================================================= */

        this.#app.use((err, req, res, next) => {

            console.error("❌ Erro capturado pelo middleware global:", err);

            if (err instanceof ErrorResponse) {

                return res
                    .status(err.httpCode)
                    .json({
                        error: err.message,
                        details: err.error
                    });
            }

            return res
                .status(500)
                .json({
                    error: "Erro interno no servidor!"
                });

        });

    };


    /* =====================================================
       ALUNO
    ===================================================== */

    setupAluno = async () => {

        const alunoDAO = new AlunoDAO(this.#database);
        const professorDAO = new ProfessorDAO(this.#database);
        const historicoCoordenadorDAO = new HistoricoCoordenadorDAO(this.#database);
        const turmaDAO = new TurmaDAO(this.#database);
        const disciplinaDAO = new DisciplinaDAO(this.#database);
        const alunoDisciplinaProfessorDAO = new AlunoDisciplinaProfessorDAO(this.#database);

        const alunoService = new AlunoService(
            alunoDAO,
            professorDAO,
            historicoCoordenadorDAO,
            turmaDAO,
            disciplinaDAO,
            alunoDisciplinaProfessorDAO
        );

        const alunoControl = new AlunoControl(alunoService);

        const alunoMiddleware = new AlunoMiddleware();

        const alunoRouter = new AlunoRoteador(
            express.Router(),
            this.#jwtMiddleware,
            alunoMiddleware,
            alunoControl
        );

        this.#app.use("/api/v1/alunos", alunoRouter.createRoutes());
    };


    /* =====================================================
       CONTESTAÇÃO
    ===================================================== */

    setupContestacao = async () => {

        const contestacaoDAO = new ContestacaoDAO(this.#database);

        const contestacaoService = new ContestacaoService(contestacaoDAO);

        const contestacaoControl = new ContestacaoControl(contestacaoService);

        const contestacaoRouter = new ContestacaoRoteador(
            express.Router(),
            this.#jwtMiddleware,
            contestacaoControl
        );

        this.#app.use("/api/v1/contestacoes", contestacaoRouter.createRoutes());

        console.log("✅ POST /api/v1/contestacoes registrado!");

    };


    /* =====================================================
       CURSO
    ===================================================== */

    setupCurso = async () => {

        const cursoDAO = new CursoDAO(this.#database);

        const cursoService = new CursoService(cursoDAO);

        const cursoControl = new CursoControl(cursoService);

        const cursoMiddleware = new CursoMiddleware();

        const cursoRouter = new CursoRoteador(
            express.Router(),
            this.#jwtMiddleware,
            cursoMiddleware,
            cursoControl
        );

        this.#app.use("/api/v1/cursos", cursoRouter.createRoutes());

    };


    /* =====================================================
       PROFESSOR
    ===================================================== */

    setupProfessor = async () => {

        const professorDAO = new ProfessorDAO(this.#database);
        const professorCursoDAO = new ProfessorCursoDAO(this.#database);

        const professorService = new ProfessorService(professorDAO, professorCursoDAO);

        const professorControl = new ProfessorControl(professorService);

        const professorMiddleware = new ProfessorMiddleware();

        const professorRouter = new ProfessorRoteador(
            express.Router(),
            this.#jwtMiddleware,
            professorMiddleware,
            professorControl
        );

        this.#app.use("/api/v1/professores", professorRouter.createRoutes());

    };


    /* =====================================================
       DISCIPLINA
    ===================================================== */

    setupDisciplina = async () => {

        const disciplinaDAO = new DisciplinaDAO(this.#database);
        const professorDAO = new ProfessorDAO(this.#database);
        const professorCursoDAO = new ProfessorCursoDAO(this.#database);
        const cursoDAO = new CursoDAO(this.#database);

        const disciplinaService = new DisciplinaService(disciplinaDAO, professorDAO, cursoDAO, professorCursoDAO);

        const disciplinaControl = new DisciplinaControl(disciplinaService);

        const disciplinaMiddleware = new DisciplinaMiddleware();

        const disciplinaRouter = new DisciplinaRoteador(
            express.Router(),
            this.#jwtMiddleware,
            disciplinaMiddleware,
            disciplinaControl
        );

        this.#app.use("/api/v1/disciplinas", disciplinaRouter.createRoutes());

    };


    /* =====================================================
       TURMA
    ===================================================== */

    setupTurma = async () => {

        const turmaDAO = new TurmaDAO(this.#database);

        const turmaService = new TurmaService(turmaDAO);

        const turmaControl = new TurmaControl(turmaService);

        const turmaMiddleware = new TurmaMiddleware();

        const turmaRouter = new TurmaRoteador(
            express.Router(),
            this.#jwtMiddleware,
            turmaMiddleware,
            turmaControl
        );

        this.#app.use("/api/v1/turmas", turmaRouter.createRoutes());

    };


    /* =====================================================
       NOTA
       (com bloqueio quando as notas estão fechadas e aviso
       ao coordenador quando o professor altera uma nota)
    ===================================================== */

    setupNota = async () => {

        const notaDAO = new NotaDAO(this.#database);
        const travaNotasDAO = new TravaNotasDAO(this.#database);
        const historicoCoordenadorDAO = new HistoricoCoordenadorDAO(this.#database);

        const notaService = new NotaService(
            notaDAO,
            travaNotasDAO,
            historicoCoordenadorDAO
        );

        const notaControl = new NotaControl(notaService);

        const notaMiddleware = new NotaMiddleware();

        const notaRouter = new NotaRoteador(
            express.Router(),
            this.#jwtMiddleware,
            notaMiddleware,
            notaControl
        );


        /* ---------- BLOQUEIO: notas fechadas ---------- */

        const configuracaoNotasDAO = new ConfiguracaoNotasDAO(this.#database);

        const professorDAO = new ProfessorDAO(this.#database);

        const configuracaoNotasService = new ConfiguracaoNotasService(
            configuracaoNotasDAO,
            professorDAO
        );

        const bloqueioNotasMiddleware = new BloqueioNotasMiddleware(
            configuracaoNotasService
        );


        /*
         * Só interfere em escrita (POST/PUT/PATCH/DELETE).
         * Leituras (GET) passam direto, como antes.
         */

        this.#app.use("/api/v1/notas", (req, res, next) => {

            if (req.method === "GET") {
                return next();
            }

            this.#jwtMiddleware.validateToken(
                req,
                res,
                () => bloqueioNotasMiddleware.bloquearSeFechado(req, res, next)
            );

        });

        this.#app.use("/api/v1/notas", notaRouter.createRoutes());

    };


    /* =====================================================
       CONFIGURAÇÃO DE NOTAS (FECHAR / LIBERAR)
    ===================================================== */

    setupConfiguracaoNotas = async () => {

        const configuracaoNotasDAO = new ConfiguracaoNotasDAO(this.#database);
        const professorDAO = new ProfessorDAO(this.#database);
        const historicoCoordenadorDAO = new HistoricoCoordenadorDAO(this.#database);

        const historicoCoordenadorService = new HistoricoCoordenadorService(
            historicoCoordenadorDAO
        );

        const configuracaoNotasService = new ConfiguracaoNotasService(
            configuracaoNotasDAO,
            professorDAO,
            historicoCoordenadorService
        );

        const configuracaoNotasControl = new ConfiguracaoNotasControl(
            configuracaoNotasService
        );

        const configuracaoNotasRouter = new ConfiguracaoNotasRoteador(
            express.Router(),
            this.#jwtMiddleware,
            configuracaoNotasControl
        );

        this.#app.use("/api/v1/notas-config", configuracaoNotasRouter.createRoutes());

    };


    /* =====================================================
       SOLICITAÇÃO DE TROCA DE CURSO DO ALUNO
    ===================================================== */

    setupSolicitacaoTransferencia = async () => {

        const solicitacaoDAO = new SolicitacaoTransferenciaDAO(this.#database);
        const alunoDAO = new AlunoDAO(this.#database);
        const professorDAO = new ProfessorDAO(this.#database);
        const historicoCoordenadorDAO = new HistoricoCoordenadorDAO(this.#database);
        const turmaDAO = new TurmaDAO(this.#database);
        const disciplinaDAO = new DisciplinaDAO(this.#database);
        const alunoDisciplinaProfessorDAO = new AlunoDisciplinaProfessorDAO(this.#database);

        const historicoCoordenadorService = new HistoricoCoordenadorService(
            historicoCoordenadorDAO
        );

        const alunoService = new AlunoService(
            alunoDAO,
            professorDAO,
            historicoCoordenadorDAO,
            turmaDAO,
            disciplinaDAO,
            alunoDisciplinaProfessorDAO
        );

        const solicitacaoService = new SolicitacaoTransferenciaService(
            solicitacaoDAO,
            alunoDAO,
            turmaDAO,
            alunoService,
            historicoCoordenadorService
        );

        const solicitacaoControl = new SolicitacaoTransferenciaControl(
            solicitacaoService
        );

        const solicitacaoRouter = new SolicitacaoTransferenciaRoteador(
            express.Router(),
            this.#jwtMiddleware,
            solicitacaoControl
        );

        this.#app.use(
            "/api/v1/solicitacoes-transferencia",
            solicitacaoRouter.createRoutes()
        );

    };


    /* =====================================================
       SOLICITAÇÃO DE PROFESSOR (ADICIONAR PROFESSOR EXISTENTE
       A OUTRO CURSO — coordenador destino pede, coordenador
       origem aprova/recusa)
    ===================================================== */

    setupSolicitacaoProfessor = async () => {

        const solicitacaoProfessorDAO = new SolicitacaoProfessorDAO(this.#database);
        const professorCursoDAO = new ProfessorCursoDAO(this.#database);
        const professorDAO = new ProfessorDAO(this.#database);
        const cursoDAO = new CursoDAO(this.#database);
        const historicoCoordenadorDAO = new HistoricoCoordenadorDAO(this.#database);

        const historicoCoordenadorService = new HistoricoCoordenadorService(
            historicoCoordenadorDAO
        );

        const solicitacaoProfessorService = new SolicitacaoProfessorService(
            solicitacaoProfessorDAO,
            professorCursoDAO,
            professorDAO,
            cursoDAO,
            historicoCoordenadorService
        );

        const solicitacaoProfessorControl = new SolicitacaoProfessorControl(
            solicitacaoProfessorService
        );

        const solicitacaoProfessorRouter = new SolicitacaoProfessorRoteador(
            express.Router(),
            this.#jwtMiddleware,
            solicitacaoProfessorControl
        );

        this.#app.use(
            "/api/v1/solicitacoes-professor",
            solicitacaoProfessorRouter.createRoutes()
        );

        console.log("✅ /api/v1/solicitacoes-professor registrado!");

    };


    /* =====================================================
       ALUNO DISCIPLINA PROFESSOR
    ===================================================== */

    setupAlunoDisciplinaProfessor = async () => {

        const dao = new AlunoDisciplinaProfessorDAO(this.#database);

        const service = new AlunoDisciplinaProfessorService(dao);

        const control = new AlunoDisciplinaProfessorControl(service);

        const middleware = new AlunoDisciplinaProfessorMiddleware();

        const router = new AlunoDisciplinaProfessorRoteador(
            express.Router(),
            this.#jwtMiddleware,
            control,
            middleware
        );

        this.#app.use("/api/v1/aluno-disciplina-professor", router.createRoutes());

    };


    /* =====================================================
       HISTÓRICO
    ===================================================== */

    setupHistoricoCoordenador = async () => {

        const dao = new HistoricoCoordenadorDAO(this.#database);

        const service = new HistoricoCoordenadorService(dao);

        const control = new HistoricoCoordenadorControl(service);

        const router = new HistoricoCoordenadorRoteador(
            express.Router(),
            this.#jwtMiddleware,
            control
        );

        this.#app.use("/api/v1/historico-coordenador", router.createRoutes());

    };


    /* =====================================================
       RODAR
    ===================================================== */

    run = () => {

        this.#app.listen(this.#porta, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${this.#porta}`);
        });

    };

};