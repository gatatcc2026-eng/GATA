const Server = require("./server");

const server = new Server(3000);


server.init() .then((usuario) => {
        console.log("Usuário encontrado:", usuario);
        server.run();
    })
    .catch((erro) => {
        console.log("Erro:", erro);
    });
