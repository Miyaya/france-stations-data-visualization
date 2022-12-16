const ctx = {
    map_w: 820,
    map_h: 720,
    bar_w: 820,
    bar_h: 420,
    stationDataPath: './data/referentiel-gares-voyageurs.geojson',
    frequentationDataPath: './data/frequentation-gares.csv'
}

function createViz() {
    console.log('Using D3 v' + d3.version)
    // let svgEl = d3.select('#main').append('svg')
    // svgEl.attr('width', ctx.map_w)
    // svgEl.attr('height', ctx.map_h)
    // svgEl.attr('id', 'map')
    // let rootG = svgEl.append('g').attr('id', 'rootG')

    // // draw map
    // let canvas = rootG.append('g').attr('id', 'canvas')
    // loadMap(canvas)

    // draw bar chart
    let svgEl2 = d3.select('#main').append('svg')
    svgEl2.attr('width', ctx.bar_w)
    svgEl2.attr('height', ctx.bar_h)
    svgEl2.attr('id', 'bar')
    let rootG2 = svgEl2.append('g').attr('id', 'rootG2')
    let canvas2 = rootG2.append('g').attr('id', 'bar')
    loadFreq(canvas2, "Paris Gare de Lyon")
}

function init() {
    let canvas = d3.select("#canvas")
    canvas.selectAll("*").remove()
    loadMap(canvas)
}

function loadFreq(canvas, name) {
    let url = 'data/frequentation-gares.csv'
    d3.csv(url).then(data => {
        let stationData = data.filter(d => d["Nom de la gare"] == name)
        // console.log("stationData", stationData)

        stationData = [
            { "year": "2015", "frequentation": stationData[0]['Total Voyageurs 2015'] },
            { "year": "2016", "frequentation": stationData[0]['Total Voyageurs 2016'] },
            { "year": "2017", "frequentation": stationData[0]['Total Voyageurs 2017'] },
            { "year": "2018", "frequentation": stationData[0]['Total Voyageurs 2018'] },
            { "year": "2019", "frequentation": stationData[0]['Total Voyageurs 2019'] },
            { "year": "2020", "frequentation": stationData[0]['Total Voyageurs 2020'] }

        ]
        // {"year": ["2015", "2016", "2017", "2018", "2019", "2020"],
        // "frequentation": [stationData[0]['Total Voyageurs 2015'], stationData[0]['Total Voyageurs 2016'], stationData[0]['Total Voyageurs 2017'], stationData[0]['Total Voyageurs 2018'], stationData[0]['Total Voyageurs 2019'], stationData[0]['Total Voyageurs 2020']]}

        let xScale = d3.scaleTime().range([10, ctx.bar_w - 20])
        let yScale = d3.scaleLinear().range([ctx.bar_h - 20, 10])
        xScale.domain(d3.extent(stationData, function (d) { return d.year }))
        canvas.append("g")
            .attr("transform", `translate(0,${ctx.bar_h - 30})`)
            .call(d3.axisBottom(xScale).ticks(6))
        yScale.domain([0, d3.max(stationData, function (d) { return d.frequentation })])
        canvas.append("g")
            .attr("transform", `translate(60,0)`)
            .call(d3.axisLeft(yScale).ticks(3))

        console.log("stationData", stationData)
        // Add the line
        canvas.append("path")
            .datum(stationData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(d => xScale(d.year))
                .y(d => yScale(d.frequentation))
            )
        console.log("done")
    })
}

function loadMap(canvas) {
    // map projection
    let projection = d3.geoMercator()
        .center([2.5, 46.5]) // latitude & longitude
        .translate([ctx.map_w / 2, ctx.map_h / 2])
        .scale(2400)

    // path generator
    let path = d3.geoPath()
        .projection(projection)

    // let color = d3.scaleOrdinal()
    //     .range(['Azure'])

    let url = 'data/regions.geojson'
    d3.json(url).then((data) => {
        // data.features.forEach(d => {
        //     console.log(d.properties.nom)
        // })
        groupStationByRegion(data)

        // binding data and creating one path per GeoJSON feature
        canvas.selectAll("path")
            .data(data.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("stroke", "dimgray")
            .attr("fill", "azure")
            .on("click", function (event, d) { drawRegion(canvas, d) })
            // .on("click", function (event, d) { d3.select(this).style("fill", "#3dd333") })
            .on("mouseover", function (event, d) { d3.select(this).style("fill", "#ddd333") })
            .on("mouseout", function (event, d) { d3.select(this).style("fill", "azure") })


        canvas.selectAll("text")
            .data(data.features)
            .enter()
            .append("text")
            .attr("fill", "darkslategray")
            .attr("transform", (d) => { return "translate(" + path.centroid(d) + ")" })
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text((d) => {
                return d.properties.nom
            })

        // append the name
        canvas.append("text")
            .attr("x", 0)
            .attr("y", 340)
            .attr("font-size", 90)
            .attr("font-weight", "bold")
            .attr("font-family", "Times New Roman")
            .attr("text-anchor", "middle")
            .attr("opacity", 0.5)

        loadStation(projection, canvas)
    }).catch(function (error) { console.log(error) })
}

function groupStationByRegion(regions) {

    // load departements-region in ctx
    let url = 'data/departements-region.json'
    d3.json(url).then((data) => {
        ctx.region_departement = { regions: [] }
        regions.features.forEach(r => {
            ctx.region_departement.regions.push({
                "code": r.properties.code,
                "name": r.properties.nom,
                "departements": [],
                "departement_codes": []
            })
        })
        // group stations in region by corresponding departement
        data.forEach(d => {
            ctx.region_departement.regions.forEach(r => {
                if (d.region_name == r.name) {
                    // r.departements.push({ "num": d.num_dep, "name": d.dep_name })
                    r.departements.push(d.dep_name)
                    r.departement_codes.push(String(d.num_dep))
                }
            })
        })
        // console.log("ctx.region_departement", ctx.region_departement)
    })
}

function drawRegion(canvas, regionData) {
    // load departements
    let regionName = regionData.properties.nom
    let targetDepartList = ctx.region_departement.regions.filter(r => r.name == regionName)
    // console.log("targetDepartList", targetDepartList)
    let url = 'data/departements.geojson'
    d3.json(url).then((departementData) => {

        let targetDepartements = departementData.features.filter(d => targetDepartList[0].departements.includes(d.properties.nom))
        console.log("targetDepartements", targetDepartements)
        canvas.selectAll("*").remove()

        let projection = d3.geoMercator()
            .center([0, 0]) // latitude & longitude
            .translate([0, 0])
            .scale(1)

        // path generator
        let path = d3.geoPath()
            .projection(projection)

        // recalculate boundary and re-center projection
        let b = path.bounds(regionData)
        let s = .95 / Math.max((b[1][0] - b[0][0]) / ctx.map_w, (b[1][1] - b[0][1]) / ctx.map_h)
        let t = [(ctx.map_w - s * (b[1][0] + b[0][0])) / 2, (ctx.map_h - s * (b[1][1] + b[0][1])) / 2]
        projection
            .scale(s)
            .translate(t)

        // console.log("regionData", regionData)
        canvas.selectAll("path")
            .data(targetDepartements)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("stroke", "dimgray")
            .attr("fill", "azure")

        canvas.selectAll("text")
            .data(targetDepartements)
            .enter()
            .append("text")
            .attr("fill", "darkslategray")
            .attr("transform", (d) => { return "translate(" + path.centroid(d) + ")" })
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text((d) => {
                return d.properties.nom
            })

        // append the name
        canvas.append("text")
            .attr("x", 0)
            .attr("y", 340)
            .attr("font-size", 90)
            .attr("font-weight", "bold")
            .attr("font-family", "Times New Roman")
            .attr("text-anchor", "middle")
            .attr("opacity", 0.5)

        loadRegionStation(projection, canvas, targetDepartList)
    })


}

function loadStation(projection, canvas) {
    d3.json(ctx.stationDataPath).then((data) => {
        // data.features.forEach(d => {
        //     console.log(d.properties["gare_alias_libelle_noncontraint"])
        // })

        canvas.selectAll("circle")
            .data(data.features.filter(d => d.geometry !== null && d.geometry.type === "Point"))
            .join("circle")
            .attr("cx", d => projection(d.geometry.coordinates)[0])
            .attr("cy", d => projection(d.geometry.coordinates)[1])
            .attr("r", 1)
            .on("mouseover", function (event, d) { d3.select("#stationName").html(d.properties["gare_alias_libelle_noncontraint"]) })
    })
}

function loadRegionStation(projection, canvas, list) {
    d3.json(ctx.stationDataPath).then((data) => {

        console.log("list", list[0].departement_codes)
        console.log("data", data)
        console.log("data", data.features.filter(d => list[0].departement_codes.includes(d.properties.departement_numero)))
        canvas.selectAll("circle")
            .data(data.features.filter(d => d.geometry !== null && d.geometry.type === "Point" && list[0].departement_codes.includes(d.properties.departement_numero)))
            .join("circle")
            .attr("cx", d => projection(d.geometry.coordinates)[0])
            .attr("cy", d => projection(d.geometry.coordinates)[1])
            .attr("r", 3)
            .on("mouseover", function (event, d) { d3.select("#stationName").html(d.properties["gare_alias_libelle_noncontraint"]) })
    })
}