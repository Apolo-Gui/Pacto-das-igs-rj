const cards = [...document.querySelectorAll('.card')],
    search = document.querySelector('#search'),
    select = document.querySelector('#institution'),
    count = document.querySelector('#count'),
    empty = document.querySelector('#empty');

[...new Set(cards.map(c => c.dataset.inst))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .forEach(x => {
        const o = document.createElement('option');
        o.value = x;
        o.textContent = x;
        select.append(o);
    });

function filter() {
    const q = search.value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, ''),
        inst = select.value;
    let n = 0;

    cards.forEach(c => {
        const t = c.dataset.search.normalize('NFD').replace(/[̀-ͯ]/g, '');
        const ok = t.includes(q) && (!inst || c.dataset.inst === inst);
        c.hidden = !ok;
        c.style.display = ok ? '' : 'none';
        if (ok) n++;
    });

    count.textContent = n + ' projeto' + (n === 1 ? '' : 's') + ' encontrado' + (n === 1 ? '' : 's');
    empty.style.display = n ? 'none' : 'block';
}

search.addEventListener('input', filter);
select.addEventListener('change', filter);
