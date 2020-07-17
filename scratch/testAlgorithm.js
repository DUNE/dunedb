console.log('STARTING MY PROCESS');
var tube_component_list = [];
// Find all heats
for(var heat of data.tubes) {
// find all tubes in heat
for(var tube of heat.tubes1) {
  console.log('working on tube',tube.tubeNumber);
  var tubeComponent = createComponent({
      type: 'Steel Tube 4x4',
      name: 'Steel Tube 4x4 ' + tube.tubeNumber,
      heatNumber: heat.heatNumber,
      caseCoilOrOtherId: heat.caseCoilOrOtherId,
  });
  tube_component_list.push(tubeComponent.componentUuid);

  var tubeTest = createTest(
    tubeComponent.componentUuid,
   'tube_unpacking_4x4',
    {
      ...tube,
      heatNumber: heat.heatNumber,
      caseCoilOrOtherId: heat.caseCoilOrOtherId,
    }
  );

}
}
// copy all high-level stuff into shipment comp.
var shipment = {po: data.po, vendor: data.vendor, orderDate: data.orderDate, supplierPO:data.supplierPo};
delete shipment.tubes;
shipment.type = 'Steel Tube 4x4 Shipment';
shipment.name = 'Steel Tube 4x4 Shipment PO' +data.po;
shipment.tubes = tube_component_list

createComponent(shipment);
console.log('HI THERE FROM INSIDE THE VM');