const NotaControl = require("../control/NotaControl");
const JwtMiddleware = require("../middleware/JwtMiddleware");
const NotaMiddleware = require("../middleware/NotaMiddleware");
const {
    exigirProfessor,
    filtrarNotasDoAluno
} = require("../middleware/PapelMiddleware");

module.exports = class NotaRoteador {

    #router;
    #notaControl;
    #jwtMiddleware;
    #notaMiddleware;

    constructor(router, jwtMiddleware, notaMiddleware, notaControl) {

        console.log("✅ NotaRoteador.constructor()");

        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#notaMiddleware = notaMiddleware;
        this.#notaControl = notaControl;
    }

    createRoutes = () => {

        // CREATE (só professor/coordenador)
        this.#router.post("/",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            NotaMiddleware.validateCreate,
            this.#notaControl.store
        );

        // LISTAR (aluno recebe só as próprias notas)
        this.#router.get("/",
            this.#jwtMiddleware.validateToken,
            filtrarNotasDoAluno,
            this.#notaControl.index
        );

        // BUSCAR POR ID (aluno só se a nota for dele)
        this.#router.get("/:idNota",
            this.#jwtMiddleware.validateToken,
            filtrarNotasDoAluno,
            NotaMiddleware.validateId,
            this.#notaControl.show
        );

        // UPDATE (só professor/coordenador)
        this.#router.put("/:idNota",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            NotaMiddleware.validateUpdate,
            this.#notaControl.update
        );

        // DELETE (só professor/coordenador)
        this.#router.delete("/:idNota",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            NotaMiddleware.validateId,
            this.#notaControl.destroy
        );

        return this.#router;
    };
};