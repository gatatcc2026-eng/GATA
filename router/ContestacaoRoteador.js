const {
    exigirAluno,
    exigirProfessor,
    exigirMesmoUsuario
} = require("../middleware/PapelMiddleware");

module.exports = class ContestacaoRoteador {

    #router;
    #jwtMiddleware;
    #contestacaoControl;

    constructor(router, jwtMiddleware, contestacaoControlDependency) {
        console.log("✅ ContestacaoRoteador.constructor()");

        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#contestacaoControl = contestacaoControlDependency;
    }

    createRoutes = () => {
        console.log("✅ ContestacaoRoteador.createRoutes()");

        /* Aluno envia contestação, sempre com a própria matrícula */
        this.#router.post(
            "/",
            this.#jwtMiddleware.validateToken,
            exigirAluno,
            exigirMesmoUsuario("body", "matricula", "matricula"),
            this.#contestacaoControl.enviarContestacao
        );

        /* Aluno lista só as próprias contestações */
        this.#router.get(
            "/aluno/:matricula",
            this.#jwtMiddleware.validateToken,
            exigirAluno,
            exigirMesmoUsuario("params", "matricula", "matricula"),
            this.#contestacaoControl.listarPorAluno
        );

        /* Aluno vê em quais disciplinas dele as notas estão fechadas */
        this.#router.get(
            "/aluno/:matricula/trava",
            this.#jwtMiddleware.validateToken,
            exigirAluno,
            exigirMesmoUsuario("params", "matricula", "matricula"),
            this.#contestacaoControl.listarDisciplinasTravadas
        );

        /* Professor lista só as contestações dele */
        this.#router.get(
            "/professor/:registro",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            exigirMesmoUsuario("params", "registro", "registro"),
            this.#contestacaoControl.listarPorProfessor
        );

        /* Professor (ou coordenador) vê quantas contestações aguardam resposta */
        this.#router.get(
            "/professor/:registro/pendentes",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            exigirMesmoUsuario("params", "registro", "registro"),
            this.#contestacaoControl.contarPendentes
        );

        /* Professor responde, sempre com o próprio registro */
        this.#router.put(
            "/responder/:idContestacao",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            exigirMesmoUsuario("body", "registroProfessor", "registro"),
            this.#contestacaoControl.responder
        );

        return this.#router;
    };
};