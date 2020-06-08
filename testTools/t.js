function randomGaussian(mean,sigma) {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    var norm =  Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return (norm*sigma)+mean;
}

    var tensions = [];
    for(var i=0;i<1000;i++)
        tensions.push(randomGaussian(100+i*0.05,20));
    console.log(tensions.join(','));
