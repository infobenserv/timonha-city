document.addEventListener("DOMContentLoaded", () => {

    const nomeJogador = document.getElementById("nomeJogador");
    const vidas = document.getElementById("vidas");
    const moedas = document.getElementById("moedas");

    const btnAventura = document.getElementById("btnAventura");
    const btnCorridas = document.getElementById("btnCorridas");
    const btnDesafios = document.getElementById("btnDesafios");

    const nomeSalvo = localStorage.getItem("timonha_nome");

    nomeJogador.textContent = nomeSalvo || "Jogador";
    vidas.textContent = "5";
    moedas.textContent = "0";

    btnAventura.onclick = function () { window.location.href="games/aventura/");
    };

    btnCorridas.onclick = function () {
        alert("🏎️ CORRIDAS\n\nO modo de corridas será iniciado em breve!");
    };

    btnDesafios.onclick = function () {
        alert("🎯 DESAFIOS\n\nOs desafios serão iniciados em breve!");
    };

});
