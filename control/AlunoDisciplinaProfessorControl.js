module.exports = class AlunoDisciplinaProfessorController {
    #alunoDisciplinaProfessorService;

    constructor(alunoDisciplinaProfessorService) {
        console.log("✅ AlunoDisciplinaProfessorController.constructor()");
        this.#alunoDisciplinaProfessorService = alunoDisciplinaProfessorService;
    }

    create = async (req, res) => {
        console.log("✅ AlunoDisciplinaProfessorController.create()");
        const resultado =
            await this.#alunoDisciplinaProfessorService.createAlunoDisciplinaProfessor(req.body);
        return res.json(resultado);
        
        
    };

    findAll = async (req, res) => {
        console.log("✅ AlunoDisciplinaProfessorController.findAll()");
        const resultado =
            await this.#alunoDisciplinaProfessorService.findAll();
        return res.json(resultado);
    };

    findById = async (req, res) => {
        console.log("✅ AlunoDisciplinaProfessorController.findById()");
        const resultado =
            await this.#alunoDisciplinaProfessorService.findById(req.params.idAlunoDisciplinaProfessor);
        return res.json(resultado);
    };

    findByField = async (req, res) => {
        console.log("✅ AlunoDisciplinaProfessorController.findByField()");
        const { field, value } = req.query;
        const resultado =
            await this.#alunoDisciplinaProfessorService.findByField(field, value);
        return res.json(resultado);
    };

    update = async (req, res) => {
        console.log("✅ AlunoDisciplinaProfessorController.update()");
        const resultado =
            await this.#alunoDisciplinaProfessorService.updateAlunoDisciplinaProfessor(req.body);
        return res.json(resultado);
    };

    delete = async (req, res) => {
        console.log("✅ AlunoDisciplinaProfessorController.delete()");
        const resultado =
            await this.#alunoDisciplinaProfessorService.deleteAlunoDisciplinaProfessor(
                req.params.idAlunoDisciplinaProfessor
            );
        return res.json(resultado);
    };
};