const CursoControl = require("../control/CursoControl");
const JwtMiddleware = require("../middleware/JwtMiddleware");
const CursoMiddleware = require("../middleware/CursoMiddleware");
const { exigirCoordenador } = require("../middleware/PapelMiddleware");

module.exports = class CursoRoteador {
    #router;
    #cursoControl;
    #jwtMiddleware;
    #cursoMiddleware;

    constructor(router, jwtMiddleware, cursoMiddleware, cursoControl) {
        console.log("✅ CursoRoteador.constructor()");
        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#cursoMiddleware = cursoMiddleware;
        this.#cursoControl = cursoControl;
    }

    createRoutes = () => {

        // Criar curso (só coordenador)
        this.#router.post("/",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#cursoMiddleware.validateBody,
            this.#cursoControl.store
        );

        // Listar cursos (qualquer usuário logado)
        this.#router.get("/",
            this.#jwtMiddleware.validateToken,
            this.#cursoControl.index
        );

        // Buscar curso por ID (qualquer usuário logado)
        this.#router.get("/:idCurso",
            this.#jwtMiddleware.validateToken,
            this.#cursoMiddleware.validateIdParam,
            this.#cursoControl.show
        );

        // Atualizar curso (só coordenador)
        this.#router.put("/:idCurso",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#cursoMiddleware.validateIdParam,
            this.#cursoMiddleware.validateBody,
            this.#cursoControl.update
        );

        // Excluir curso (só coordenador)
        this.#router.delete("/:idCurso",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#cursoMiddleware.validateIdParam,
            this.#cursoControl.destroy
        );

        return this.#router;
    }
};