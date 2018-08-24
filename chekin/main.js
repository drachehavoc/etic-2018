const updateAtTime = 31
const baseUrl = "http://www.etic.ifc-camboriu.edu.br/etic-2018/server/apiRequests.php"

// ----------------------------------------------------------------------------

console.log("?ID DO EVENTO")
console.log(":WEB CAM UTILIZADA")

// ----------------------------------------------------------------------------

const domOptions = document.querySelector('#options')
const domOptionClose = domOptions.querySelector('.close')
const domOptionWaitList = document.querySelector('#lista-de-espera')
const domOptionFree = document.querySelector('#entrada-de-nao-cadastrados')
const domSelectEvents = document.querySelector('#selecionar-evento')
const domBubbleTimeLeft = document.querySelector('.time-left')
const domBubbleInsc = document.querySelector('.insc')
const domQrcodeInput = document.querySelector('.qrcode input')
const domInscritos = document.querySelector('.inscritos')
const domVideo = document.querySelector('video')
const domMsgs = document.querySelector('.msgs')
const domEticoins = document.querySelector('.eticoins .points')
const domEticoinsName = document.querySelector('.eticoins .nome')
const args = document.location.search.substr(1).split(':')
const event = args[0] || null
const camNo = args[1] || 0
const localName = `joined-${event}`
const joined = JSON.parse(localStorage.getItem(localName)) || []

let updateTimeLeft = updateAtTime
let saving = false
let confIsOpen = false

const init = () => {
    scanner()
    attachEvents()
    loadEventData(event)
    loadEnrolledData(event)

    let tickTimeLeftController = setInterval(tickTimeLeft, 1000)

    if (!event) {
        saving = true
        clearInterval(tickTimeLeftController)
    }
}

const save = () => {
    saving = true
    setTimeout(() => {
        saving = false
        updateTimeLeft = updateAtTime
    }, 1000)
}

const showLocalStored = () => {
    domBubbleInsc.innerText = joined.length
    joined.forEach(id => {
        if (!id) return
        let el = document.querySelector(`[data-id="${id.toString()}"]`)
        if (el) el.classList.add('selected')
    })
}

const scanner = async () => {
    let scanner = new Instascan.Scanner({
        video: domVideo,
        refractoryPeriod: 3000
    })

    try {
        let cameras = await Instascan.Camera.getCameras()
        if (cameras.length > 0)
            scanner.start(cameras[camNo])
        else
            alert('No cameras found.')
    } catch (e) {
        console.error(e)
    }

    scanner.addListener('scan', v => saveTrigger(v))
}

const loadEventData = async evento => {
    if (!event)
        return document.querySelector('.title').innerText = "saldo eticoins"
    // let req = await fetch(`api/evento.php?id=${evento}`)
    let req = await fetch(`${baseUrl}?option=carregarAtividadeUnica&id=${evento}`)
    let res = await req.json()
    document.querySelector('.title').innerText = res.nome
}

const loadEnrolledData = async evento => {
    let req = !evento
        // ? await fetch(`${baseUrl}?option=carregarTodosInscritos`)
        ? await fetch(`api/inscritos.php`)
        // : await fetch(`api/inscritos-por-evento.php?id=${evento}`)
        : await fetch(`${baseUrl}?option=carregarInscritos&id=${evento}`)

    let res = await req.json()
    let lis = document.querySelector('.inscritos')

    res.forEach(ins => {
        let className = []

        if (parseInt(ins.presenca))
            className.push("selected")

        if (parseInt(ins.espera))
            className.push("espera")

        lis.innerHTML += `<div class="${className.join(" ")}" data-espera="${ins.espera}" data-id="${ins.id}">${ins.nome.toLowerCase()}</div>`
    })

    showLocalStored()
}

let rollDiceFetchController

const rollDice = async (id, name) => {
    if (rollDiceFetchController)
        rollDiceFetchController.abort()

    rollDiceFetchController = new AbortController()

    let animating = false
    let signal = rollDiceFetchController.signal

    const animate = () => {
        let startAt = 99
        let animationCurrent = startAt
        animating = true
        const doTheMagic = () => {
            if (!animating) return
            animationCurrent = --animationCurrent || startAt
            domEticoins.innerText = animationCurrent + "/" + animationCurrent
            window.requestAnimationFrame(doTheMagic)
        }
        doTheMagic()
    }

    const stopAnimate = value => {
        animating = false
        domEticoins.innerText = value
    }

    const success = value => {
        setTimeout(() => stopAnimate(value), 1000)
    }

    const fail = error => {
        stopAnimate('---')
        domEticoinsName.innerText = "..."
    }

    animate()

    domEticoinsName.innerText = name

    fetch(`api/eticoins-por-inscrito.php?id=${id}`, { signal })
        .then(r => r.text())
        .then(success)
        .catch(fail)
}

const msg = (type, msg) => {
    domMsgs.classList.remove('show')
    setTimeout(() => {
        domMsgs.dataset.type = type
        domMsgs.innerText = msg
        domMsgs.classList.add('show')
    }, 300)
}

const localStock = id => {
    id = parseInt(id)

    if (!joined.includes(id)) {
        joined.push(id)
        domBubbleInsc.innerText = joined.length
    }

    localStorage.setItem(localName, JSON.stringify(joined))
}

const toggleConf = async () => {
    confIsOpen = !confIsOpen
    domOptions.classList.toggle('show')
    if (domOptions.classList.contains('show')) {
        domSelectEvents.innerHTML = '<option>loading</option>'
        domSelectEvents.innerHTML += '<option value="">saldo de eticoins</option>'
        const load = async () => {
            let req = await fetch('api/eventos.php') 
            let res = await req.json()
            domSelectEvents.querySelector("option").innerText = "selecione um evento"
            res.forEach(ev => {
                domSelectEvents.innerHTML += `<option value="${ev.id}">${ev.nome.toLowerCase()}</option>`
            })
        }
        load()
    }
}

const saveTrigger = id => {
    id = id.substr(0, 4)

    if (id == "conf")
        return toggleConf()

    if (domOptionFree.checked) {
        msg('ok', `seja bem vindo, forasteiro!`)
        localStock(id)
        return
    }

    let target = document.querySelector(`[data-id="${parseInt(id)}"]`)

    if (!target)
        return msg('error', `Você não esta cadastrado neste evento!`)

    let name = target.innerText.split(' ')[0]

    if (target.dataset.espera == "1" && !domOptionWaitList.checked)
        return msg('espera', `Olá, ${name}! aguarde a lista de espera ser liberada e tente novamente.`)

    localStock(id)
    rollDice(id, name)
    msg('ok', `Olá, ${name}!`)
    domInscritos.scrollTop = target.offsetTop - domInscritos.offsetTop - (domInscritos.offsetHeight / 2)
    target.classList.add('selected')
}

const tickTimeLeft = () => {
    if (saving)
        return

    updateTimeLeft--

    if (updateTimeLeft == 0)
        save()

    domBubbleTimeLeft.innerText = updateTimeLeft
}

// -- Attach Events ---------------------------------------------------

const attachEvents = () => {
    domQrcodeInput.addEventListener('keyup', ev => {
        if (domQrcodeInput.value.length < 4) return
        let value = ev.target.value
        ev.preventDefault()
        domQrcodeInput.value = ''
        saveTrigger(value)
    })

    domSelectEvents.addEventListener('change', ev => location = "?"+domSelectEvents.value)
    domOptionClose.addEventListener('click', ev => domOptions.classList.remove('show'))
    domMsgs.addEventListener('transitionend', ev => domMsgs.classList.remove('show'))
    domMsgs.addEventListener('animationend', ev => domMsgs.classList.remove('show'))
    window.addEventListener('keydown', ev => domQrcodeInput.focus())
}

// -- Default Events ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", init)