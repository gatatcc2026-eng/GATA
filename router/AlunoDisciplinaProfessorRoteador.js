const AlunoDisciplinaProfessorMiddleware = require("../middleware/AlunoDisciplinaProfessorMiddleware");

module.exports = class AlunoDisciplinaProfessorRoteador {

    #router;
    #alunoDisciplinaProfessorControl;
    #jwtMiddleware;
    #alunoDisciplinaProfessorMiddleware;

    constructor(
        router,
        jwtMiddleware,
        alunoDisciplinaProfessorControl,
        alunoDisciplinaProfessorMiddleware
    ) {

        console.log("✅ AlunoDisciplinaProfessorRoteador.constructor()");

        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#alunoDisciplinaProfessorControl = alunoDisciplinaProfessorControl;
        this.#alunoDisciplinaProfessorMiddleware = alunoDisciplinaProfessorMiddleware;
    }

    createRoutes = () => {
        console.log("✅ AlunoDisciplinaProfessorRoteador.createRoutes()");
        /*
        console.log(this.#jwtMiddleware.validateToken);
        console.log(this.#alunoDisciplinaProfessorMiddleware.validateCreate);
        console.log(this.#alunoDisciplinaProfessorMiddleware.validateUpdate);
        console.log(this.#alunoDisciplinaProfessorMiddleware.validateIdParam);
        console.log(this.#alunoDisciplinaProfessorControl.store);
        */

        // CREATE
        this.#router.post("/",
            this.#jwtMiddleware.validateToken,
            this.#alunoDisciplinaProfessorMiddleware.validateCreate,
            this.#alunoDisciplinaProfessorControl.create,
            
        );

        // LISTAR TODOS
        this.#router.get("/",
            this.#jwtMiddleware.validateToken,
            this.#alunoDisciplinaProfessorControl.findAll
        );

        // BUSCAR POR ID
        this.#router.get("/:idAlunoDisciplinaProfessor",
            this.#jwtMiddleware.validateToken,
            this.#alunoDisciplinaProfessorControl.findById,
            this.#alunoDisciplinaProfessorMiddleware.validateCreate
        );

        // UPDATE
        this.#router.put("/:idAlunoDisciplinaProfessor",
            this.#jwtMiddleware.validateToken,
            this.#alunoDisciplinaProfessorControl.update,
            this.#alunoDisciplinaProfessorMiddleware.validateIdParam,
            this.#alunoDisciplinaProfessorMiddleware.validateUpdate
        );

        // DELETE
        this.#router.delete("/:idAlunoDisciplinaProfessor",
            this.#jwtMiddleware.validateToken,
            this.#alunoDisciplinaProfessorControl.delete,
            this.#alunoDisciplinaProfessorMiddleware.validateIdParam
        );

        return this.#router;
    };
};