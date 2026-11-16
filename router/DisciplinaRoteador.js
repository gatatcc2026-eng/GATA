const DisciplinaControl = require("../control/DisciplinaControl");
const JwtMiddleware = require("../middleware/JwtMiddleware");
const DisciplinaMiddleware = require("../middleware/DisciplinaMiddleware");

module.exports = class DisciplinaRoteador {

    #router;
    #jwtMiddleware;
    #disciplinaMiddleware;
    #disciplinaControl;

    constructor(router, jwtMiddleware, disciplinaMiddleware, disciplinaControl) {

        console.log("✅ DisciplinaRoteador.constructor()");

        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#disciplinaMiddleware = disciplinaMiddleware;
        this.#disciplinaControl = disciplinaControl;
    }

    createRoutes = () => {

        console.log(this.#jwtMiddleware.validateToken);
        console.log(this.#disciplinaMiddleware.validateBody);
        console.log(this.#disciplinaControl.store);

        this.#router.post("/",
            this.#jwtMiddleware.validateToken,
            this.#disciplinaMiddleware.validateBody,
            this.#disciplinaControl.store
        );

        this.#router.get("/",
            this.#jwtMiddleware.validateToken,
            this.#disciplinaControl.index
        );

        this.#router.get("/:idDisciplina",
            this.#jwtMiddleware.validateToken,
            this.#disciplinaMiddleware.validateIdParam,
            this.#disciplinaControl.show
        );

        // 🔻 PUT agora usa validateUpdateBody (campos opcionais, ideal para update parcial)
        this.#router.put("/:idDisciplina",
            this.#jwtMiddleware.validateToken,
            this.#disciplinaMiddleware.validateIdParam,
            this.#disciplinaMiddleware.validateUpdateBody,
            this.#disciplinaControl.update
        );

        this.#router.delete("/:idDisciplina",
            this.#jwtMiddleware.validateToken,
            this.#disciplinaMiddleware.validateIdParam,
            this.#disciplinaControl.destroy
        );

        return this.#router;
    }
}