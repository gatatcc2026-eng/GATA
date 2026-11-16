const ProfessorControl = require("../control/ProfessorControl");
const JwtMiddleware = require("../middleware/JwtMiddleware");
const ProfessorMiddleware = require("../middleware/ProfessorMiddleware");
const {
    exigirProfessor,
    exigirCoordenador,
    removerSenhaDaResposta
} = require("../middleware/PapelMiddleware");

module.exports = class ProfessorRoteador {
    #router;
    #professorControl;
    #jwtMiddleware;
    #professorMiddleware;

    constructor(router, jwtMiddleware, professorMiddleware, professorControl) {
        console.log("✅ ProfessorRoteador.constructor()");

        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#professorMiddleware = professorMiddleware;
        this.#professorControl = professorControl;
    }

    createRoutes = () => {

        // Criar professor (só coordenador)
        this.#router.post(
            "/",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#professorMiddleware.validateBody,
            this.#professorControl.store
        );

        // Login (único endpoint sem JWT)
        this.#router.post(
            "/login",
            this.#professorControl.login
        );

        // Listar professores (professor/coordenador; aluno não)
        this.#router.get(
            "/",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            removerSenhaDaResposta,
            this.#professorControl.index
        );

        // Professores que ainda não estão no meu curso (busca do botão
        // "Adicionar professor existente").
        // IMPORTANTE: precisa vir ANTES de "/:registro", senão
        // "disponiveis" seria lido como um registro.
        this.#router.get(
            "/disponiveis",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            removerSenhaDaResposta,
            this.#professorControl.disponiveis
        );

        // Buscar professor por registro (professor/coordenador; aluno não)
        this.#router.get(
            "/:registro",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            removerSenhaDaResposta,
            this.#professorMiddleware.validateRegistroParam,
            this.#professorControl.show
        );

        // Atualizar professor (só coordenador)
        this.#router.put(
            "/:registro",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#professorMiddleware.validateRegistroParam,
            this.#professorMiddleware.validateUpdateBody,
            this.#professorControl.update
        );

        // Remover professor do meu curso, mantendo o cadastro (só coordenador)
        this.#router.post(
            "/:registro/remover-do-curso",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#professorMiddleware.validateRegistroParam,
            this.#professorControl.removerDoCurso
        );

        // Deletar professor, cadastro inteiro (só coordenador)
        this.#router.delete(
            "/:registro",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#professorMiddleware.validateRegistroParam,
            this.#professorControl.destroy
        );

        return this.#router;
    };
};