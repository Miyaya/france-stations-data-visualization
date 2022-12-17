const ctx = {
    map_w: 820,
    map_h: 720,
    chart_w: 820,
    chart_h: 420,
    stationDataPath: './data/referentiel-gares-voyageurs.geojson',
    frequentationDataPath: './data/frequentation-gares.csv'
}

function createViz() {
    console.log('Using D3 v' + d3.version)
    let svgEl = d3.select('#main').append('svg')
    svgEl.attr('width', ctx.map_w)
    svgEl.attr('height', ctx.map_h)
    svgEl.attr('id', 'map')
    let rootG = svgEl.append('g').attr('id', 'rootG')

    // draw map
    let canvas = rootG.append('g').attr('id', 'canvas')
    loadMap(canvas)

    // TODO: 
    // draw chart: bar=avg. freq. in a region; line=avg. freq. in all regions
    // let svgEl2 = d3.select('#main').append('svg')
    // svgEl2.attr('width', ctx.chart_w)
    // svgEl2.attr('height', ctx.chart_h)
    // svgEl2.attr('id', 'chart')
    // let rootG2 = svgEl2.append('g').attr('id', 'rootG2')
    // let canvas2 = rootG2.append('g').attr('id', 'chart')
    // loadFreq(canvas2)
}

function init() {
    let canvas = d3.select("#canvas")
    canvas.selectAll("*").remove()
    loadMap(canvas)
}

function loadFreq(canvas) {
    if (ctx.region_departement == undefined) {
        let url = 'data/regions.geojson'
        d3.json(url).then((data) => {
            groupStationByRegion(data)
            console.log("0", ctx.region_departement.regions[0])
        })
    }
    let url = 'data/frequentation-gares-post-process.csv'
    d3.csv(url).then(data => {

        // ctx.region_departement.regions.push({
        //     "code": r.properties.code,
        //     "name": r.properties.nom,
        //     "departements": [],
        //     "departement_codes": []
        // })
        ctx.region_departement.regions.forEach(r => {
            r.totalFreq = {
                "2015": 0, "2016": 0, "2017": 0, "2018": 0, "2019": 0, "2020": 0
            }
        })
        data.forEach(d => {
            console.log("2", ctx.region_departement.regions[0])
            ctx.region_departement.regions.forEach(r => {
                if (r.departements.includes(data["Nom de la gare"])) {
                    r.totalFreq["2015"] += data["2015"]
                    r.totalFreq["2016"] += data["2016"]
                    r.totalFreq["2017"] += data["2017"]
                    r.totalFreq["2018"] += data["2018"]
                    r.totalFreq["2019"] += data["2019"]
                    r.totalFreq["2020"] += data["2020"]
                }
            })
            // stationData.push({
            //     "name": d["Nom de la gare"],
            //     "data": [
            //         { "year": 2020, "freq": d["2020"] },
            //         { "year": 2019, "freq": d["2019"] },
            //         { "year": 2018, "freq": d["2018"] },
            //         { "year": 2017, "freq": d["2017"] },
            //         { "year": 2016, "freq": d["2016"] },
            //         { "year": 2015, "freq": d["2015"] }
            //     ]
            // })
        })
        console.log("1", ctx.region_departement.regions[1])

        // parse the date / time
        let parseTime = d3.timeParse("%Y")

        let x = d3.scaleTime().range([0, ctx.chart_w])
        let y = d3.scaleLinear().range([ctx.chart_h, 0])

        // define the line
        let valueline = d3.line()
            .x(function (d) { return x(d.year) })
            .y(function (d) { return y(d.freq) })

        // format the data
        stationData[0].data.forEach(function (d) {
            d.year = parseTime(d.year)
            d.freq = +d.freq
        });

        // sort years ascending
        stationData[0].data.sort(function (a, b) {
            return a["year"] - b["year"]
        })

        // Scale the range of the data
        x.domain(d3.extent(stationData[0].data, function (d) { return d.year }));
        y.domain([0, d3.max(stationData[0].data, function (d) {
            return Math.max(d.freq);
        })])
        // Add the valueline path.
        canvas.append("path")
            .data([stationData[0].data])
            .attr("class", "line")
            .attr("d", valueline)
            .attr("stroke", "steelblue")
            .attr("fill", "none")

        // Add the X Axis
        canvas.append("g")
            .attr("transform", "translate(0," + ctx.chart_h + ")")
            .call(d3.axisBottom(x))

        // Add the Y Axis
        canvas.append("g")
            .call(d3.axisLeft(y));
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

    let url = 'data/regions.geojson'
    d3.json(url).then((data) => {
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

function drawDepartement(canvas, departData) {
    // console.log("departData", departData)
    canvas.selectAll("*").remove()

    let projection = d3.geoMercator()
        .center([0, 0]) // latitude & longitude
        .translate([0, 0])
        .scale(1)

    // path generator
    let path = d3.geoPath()
        .projection(projection)

    let b = path.bounds(departData)
    let s = .95 / Math.max((b[1][0] - b[0][0]) / ctx.map_w, (b[1][1] - b[0][1]) / ctx.map_h)
    let t = [(ctx.map_w - s * (b[1][0] + b[0][0])) / 2, (ctx.map_h - s * (b[1][1] + b[0][1])) / 2]
    projection
        .scale(s)
        .translate(t)

    // console.log("t", t)
    canvas.selectAll("path")
        .data([departData])
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke", "dimgray")
        .attr("fill", "azure")

    loadDepartStation(projection, canvas, departData.properties.code)
}
function drawRegion(canvas, regionData) {
    // load departements
    let regionName = regionData.properties.nom
    let targetDepartList = ctx.region_departement.regions.filter(r => r.name == regionName)
    // console.log("targetDepartList", targetDepartList)
    let url = 'data/departements.geojson'
    d3.json(url).then((departementData) => {

        let targetDepartements = departementData.features.filter(d => targetDepartList[0].departements.includes(d.properties.nom))
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
        // console.log("targetDepartements ", targetDepartements)
        canvas.selectAll("path")
            .data(targetDepartements)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("stroke", "dimgray")
            .attr("fill", "azure")
            .on("click", function (event, d) { drawDepartement(canvas, d) })
            .on("mouseover", function (event, d) { d3.select(this).style("fill", "#ddd333") })
            .on("mouseout", function (event, d) { d3.select(this).style("fill", "azure") })

        console.log("targetDepartements", targetDepartements)
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
            .attr("r", 0)
            .on("mouseover", function (event, d) {
                d3.select("#stationName").html(d.properties["gare_alias_libelle_noncontraint"])
            })
            // animation
            .transition()
            .ease(d3.easeLinear)
            .duration(1000)
            .delay(1500)
            .attr("r", 1)
            .attr("fill", "DarkSlateGray")
    })
}

function loadDepartStation(projection, canvas, departCode) {
    d3.json(ctx.stationDataPath).then((data) => {
        data = data.features.filter(d => d.geometry !== null && d.geometry.type === "Point" && d.properties.departement_numero == departCode)
        canvas.selectAll("circle")
            .data(data)
            .join("circle")
            .attr("cx", d => projection(d.geometry.coordinates)[0])
            .attr("cy", d => projection(d.geometry.coordinates)[1])
            .attr("r", 0)
            .on("mouseover", function (event, d) {
                d3.select("#stationName").html(d.properties["gare_alias_libelle_noncontraint"])
                d3.select(this).attr("fill", "red")

            })
            .on("mouseout", function (event) {
                d3.select(this).attr("fill", "DarkSlateGray")
            })
            // animation
            .transition()
            .ease(d3.easeLinear)
            .duration(600)
            .delay(600)
            .attr("r", 3)
            .attr("fill", "DarkSlateGray")

        console.log("station data", data)
        canvas.selectAll("text")
            .data(data)
            .enter()
            .append("text")
            .attr("fill", "darkslategray")
            .attr("transform", (d) => { return `translate(${projection(d.geometry.coordinates)[0]}, ${projection(d.geometry.coordinates)[1] - 10})` })
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text((d) => {
                return d.properties["gare_alias_libelle_noncontraint"]
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
    })
}

function loadRegionStation(projection, canvas, list) {
    d3.json(ctx.stationDataPath).then((data) => {

        let tooltip = d3.select("#main")
            .append("div")
            .style("opacity", 0)
            .attr("width", 10)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")
            .style("position", "absolute")
        // .style("z-index", 10)

        canvas.selectAll("circle")
            .data(data.features.filter(d => d.geometry !== null && d.geometry.type === "Point" && list[0].departement_codes.includes(d.properties.departement_numero)))
            .join("circle")
            .attr("cx", d => projection(d.geometry.coordinates)[0])
            .attr("cy", d => projection(d.geometry.coordinates)[1])
            .attr("r", 0)
            .on("mouseover", function (event, d) {
                d3.select("#stationName").html(d.properties["gare_alias_libelle_noncontraint"])
                d3.select(this).attr("fill", "red")
                tooltip.style("opacity", 1)

                // console.log(tooltip)
            })
            .on("mousemove", function (event, d) {
                tooltip
                    .html(d.properties.departement_numero)
                    // .attr("transform", `translate(${event.x}, ${event.y})`)
                    .style("left", (parseInt(d3.select(this).attr("cx")) + document.getElementById("main").offsetLeft) + "px")
                    .style("top", (parseInt(d3.select(this).attr("cy")) + document.getElementById("main").offsetTop) + "px")
            })
            .on("mouseleave", function (event) {
                d3.select(this).attr("fill", "DarkSlateGray")
                tooltip.style("opacity", 0)
            })
            // animation
            .transition()
            .ease(d3.easeLinear)
            .duration(1000)
            .delay(1000)
            .attr("r", 2.5)
            .attr("fill", "DarkSlateGray")

    })
}