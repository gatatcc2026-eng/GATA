const TurmaControl = require("../control/TurmaControl");
const JwtMiddleware = require("../middleware/JwtMiddleware");
const TurmaMiddleware = require("../middleware/TurmaMiddleware");

module.exports = class TurmaRoteador {
    #router;
    #turmaControl;
    #jwtMiddleware;
    #turmaMiddleware;

    constructor(router, jwtMiddleware, turmaMiddleware, turmaControl) {
        console.log("✅ TurmaRoteador.constructor()");
        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#turmaMiddleware = turmaMiddleware;
        this.#turmaControl = turmaControl;
    }
    createRoutes = () => {
        this.#router.post("/",
            this.#jwtMiddleware.validateToken,
            this.#turmaMiddleware.validateBody,
            this.#turmaControl.store
        );

        // Listar todas as turmas (JWT)
        this.#router.get("/",
            this.#jwtMiddleware.validateToken,
            this.#turmaControl.index
        );

        // Buscar turma por ID (JWT + validação do ID)
        this.#router.get("/:idTurma",
            this.#jwtMiddleware.validateToken,
            this.#turmaMiddleware.validateIdParam,
            this.#turmaControl.show
        );

        // Atualizar turma (JWT + validação do ID + validação do body)
        this.#router.put("/:idTurma",
            this.#jwtMiddleware.validateToken,
            this.#turmaMiddleware.validateIdParam,
            this.#turmaMiddleware.validateBody,
            this.#turmaControl.update
        );

        // Deletar turma (JWT + validação do ID)
        this.#router.delete("/:idTurma",
            this.#jwtMiddleware.validateToken,
            this.#turmaMiddleware.validateIdParam,
            this.#turmaControl.destroy
        );

        return this.#router;
    }
};