import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../App.css';
import 'leaflet-routing-machine';
import { Room, BuildingWithCoords } from '../../types/rooms';
import { decode } from "@mapbox/polyline";
import {
	Typography,
	Button,
	Box,
	Divider,
	Card,
	CardContent,
	CardActions,
    Stack
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { styled } from "@mui/material/styles";
import RoomSearch from "../RoomSearch/RoomSearch";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";

interface MapComponentProps {
	onRoomsSelect: (rooms: Room[]) => void;
	selectedRooms: Room[];
	onSelectedRoomsChange: (rooms: Room[]) => void;
	selectedBuilding: BuildingWithCoords | null;
	onBuildingSelect: (building: BuildingWithCoords | null) => void;
}

const GlassCard = styled(Card)(({ theme }) => ({
	minWidth: 150,
	background: 'rgba(0, 0, 0, 0.7)',
	backdropFilter: 'blur(10px)',
	WebkitBackdropFilter: 'blur(10px)',
	border: '0px solid rgba(0, 0, 0, 0.5)',
	boxShadow: '0px 0px 15px 5px rgba(0, 0, 0, 0.6)',
	borderRadius: '16px',
	overflow: 'visible'
}));

const GlassButton = styled(Button)(({ theme }) => ({
	backgroundColor: 'rgba(0, 153, 255, 0.6)',
	backdropFilter: 'blur(4px)',
	WebkitBackdropFilter: 'blur(4px)',
	textTransform: 'none',
	borderRadius: '8px',
	padding: '6px 16px',
	transition: 'all 0.2s ease-in-out',
	'&:hover': {
		backgroundColor: 'rgba(0, 153, 255, 0.8)',
		boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
		transform: 'translateY(-1px)'
	}
}));

const defaultIcon = new L.Icon({
	iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
});

const highlightedIcon = new L.Icon({
	iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
	iconSize: [30, 49], // Slightly larger than default
	iconAnchor: [15, 49],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
});

const popupStyles = `
  .leaflet-popup-content-wrapper {
    background: transparent !important;
    box-shadow: none !important;
    border-radius: 16px !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
  }
  .leaflet-popup-tip {
    background: rgba(22, 28, 36, 0.85) !important;
    backdrop-filter: blur(10px) !important;
    -webkit-backdrop-filter: blur(10px) !important;
  }
`;

const style = document.createElement('style');
style.textContent = popupStyles;
document.head.appendChild(style);


const CustomPopup = ({ building, onBuildingSelect, roomCount }: {
	building: BuildingWithCoords,
	onBuildingSelect: (building: BuildingWithCoords) => void,
	roomCount: number
}) => (
	<GlassCard>
		<CardContent sx={{ pb: 1 }}>
			<Typography
				variant="h6"
				sx={{
					color: 'rgba(255, 255, 255, 0.95)',
					fontSize: '1.1rem',
					fontWeight: 600,
					mb: 1
				}}
			>
				{building.fullname} ({building.shortname})
			</Typography>

			<Stack spacing={1}>
				<Box sx={{
					display: 'flex',
					alignItems: 'center',
					gap: 1,
					opacity: 0.8
				}}>
					<LocationOnIcon
						fontSize="small"
						sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
					/>
					<Typography
						variant="body2"
						sx={{
							color: 'rgba(255, 255, 255, 0.7)',
							fontSize: '0.85rem'
						}}
					>
						{building.address}
					</Typography>
				</Box>

				<Box sx={{
					display: 'flex',
					alignItems: 'center',
					gap: 1,
					opacity: 0.8
				}}>
					<MeetingRoomIcon
						fontSize="small"
						sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
					/>
					<Typography
						variant="body2"
						sx={{
							color: 'rgba(255, 255, 255, 0.7)',
							fontSize: '0.85rem'
						}}
					>
						 Total Room{roomCount !== 1 ? 's' : ''}: {roomCount}
					</Typography>
				</Box>
			</Stack>

			<Divider sx={{
				my: 1.5,
				borderColor: 'rgba(255, 255, 255, 0.1)'
			}} />
		</CardContent>

		<CardActions sx={{
			justifyContent: 'flex-end',
			p: 2,
			pt: 0
		}}>
			<GlassButton
				startIcon={<MeetingRoomIcon />}
				onClick={() => onBuildingSelect(building)}
				variant="contained"
				size="small"
			>
				View Rooms
			</GlassButton>
		</CardActions>
	</GlassCard>
);

const MapComponent = ({
						  onRoomsSelect,
						  selectedRooms,
						  onSelectedRoomsChange,
						  selectedBuilding,
						  onBuildingSelect
					  }: MapComponentProps) => {
	const [buildings, setBuildings] = useState<BuildingWithCoords[]>([]);
	const [loading, setLoading] = useState(true);
	const [allRooms, setAllRooms] = useState<Room[]>([]);

	const getBuildingRoomCount = (buildingCode: string) => {
		return allRooms.filter(room => room.shortname === buildingCode).length;
	};


	useEffect(() => {
		const fetchBuildingData = async () => {
			try {
				const response = await fetch('http://localhost:4321/query', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [
								"rooms_fullname",
								"rooms_shortname",
								"rooms_address",
								"rooms_lat",
								"rooms_lon"
							],
							ORDER: { dir: "UP", keys: ["rooms_shortname"] }
						}
					})
				});

				if (!response.ok) throw new Error('Failed to fetch building data');

				const data = await response.json();
				const uniqueBuildings = data.result.map((item: any): BuildingWithCoords => ({
					fullname: item.rooms_fullname,
					shortname: item.rooms_shortname,
					address: item.rooms_address,
					lat: item.rooms_lat,
					lon: item.rooms_lon
				}));

				setBuildings(uniqueBuildings);
			} catch (error) {
				console.error('Error fetching building data:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchBuildingData();
	}, []);

	useEffect(() => {
		const fetchAllRooms = async () => {
			try {
				const response = await fetch('http://localhost:4321/query', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [
								"rooms_fullname",
								"rooms_shortname",
								"rooms_number",
								"rooms_address",
								"rooms_seats",
								"rooms_type",
								"rooms_furniture",
								"rooms_lat",
								"rooms_lon"
							],
							ORDER: { dir: "UP", keys: ["rooms_shortname", "rooms_number"] }
						}
					})
				});

				if (!response.ok) throw new Error('Failed to fetch rooms data');

				const data = await response.json();
				const uniqueRooms = data.result.map((item: any): Room => ({
					fullname: item.rooms_fullname,
					shortname: item.rooms_shortname,
					address: item.rooms_address,
					lat: item.rooms_lat,
					lon: item.rooms_lon,
					number: item.rooms_number,
					name: item.rooms_name,
					seats: item.rooms_seats,
					type: item.rooms_type,
					furniture: item.rooms_furniture,
					href: item.rooms_href
				}));
				setAllRooms(uniqueRooms);
			} catch (error) {
				console.error('Error fetching rooms:', error);
			}
		};

		fetchAllRooms();
	}, []);

	const onBuildingMarkerClick = (building: BuildingWithCoords) => {
		if (selectedBuilding?.shortname === building.shortname) {
			onBuildingSelect(null);
		} else {
			onBuildingSelect(building);
		}
	};

	const RoutingControl = () => {
		const map = useMap();
		const [routeLayer, setRouteLayer] = useState<L.Polyline | null>(null);
		const apiKey = '5b3ce3597851110001cf62483a25be3ea2f44742bf588e4c0fbad6fc';

		const clearRoute = () => {
			if (routeLayer) {
				map.removeLayer(routeLayer);
				setRouteLayer(null);
			}
		};

		useEffect(() => {
			clearRoute();

			if (selectedRooms.length < 2) {
				return;
			}

			const calculateRoute = async () => {
				const coordinates = selectedRooms.map(room => [room.lon, room.lat]);

				try {
					const response = await fetch(
						`https://thingproxy.freeboard.io/fetch/https://api.openrouteservice.org/v2/directions/foot-walking`, {
							method: 'POST',
							headers: {
								'Authorization': apiKey,
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								coordinates
							})
						});

					if (!response.ok) throw new Error('Failed to fetch route');

					const data = await response.json();
					const route = data.routes[0];
					const geometry = route.geometry;

					const decodedCoordinates = decode(geometry);
					const routeCoordinates = decodedCoordinates.map(coord =>
						[coord[0], coord[1]]
					);

					const newRouteLayer = L.polyline(routeCoordinates, {
						color: 'blue',
						weight: 4,
						opacity: 0.7
					});

					newRouteLayer.addTo(map);
					setRouteLayer(newRouteLayer);

					map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] });

				} catch (error) {
					console.error('Error fetching route:', error);
				}
			};

			calculateRoute();

			return () => {
				if (routeLayer) {
					map.removeLayer(routeLayer);
				}
				const routes = document.querySelectorAll('.leaflet-overlay-pane path');
				routes.forEach(route => route.remove());
			};
		}, [map, selectedRooms, apiKey]);

		return null;
	};

	if (loading) return <div>Loading campus map...</div>;

	return (
		<>
			<Box sx={{
				position: 'absolute',
				top: 20,
				left: '50%',
				transform: 'translateX(-50%)',
				zIndex: 1000,
				pointerEvents: 'auto',
				display: 'flex',
				alignItems: 'center',
				gap: 2,
				maxWidth: '800px',
				width: '30%'
			}}>
				<GlassCard sx={{
					display: 'flex',
					alignItems: 'center',
					py: 1,
					px: 3,
					width: '80%',
					borderRadius: '16px',
					gap: 2
				}}>
					<Typography
						variant="h7"
						sx={{
							color: 'rgba(255, 255, 255, 0.8)',
							whiteSpace: 'nowrap',
							fontWeight: 200
						}}
					>
						Campus Explorer
					</Typography>

					<Box sx={{ flex: 1 }}>
						<RoomSearch
							rooms={allRooms}
							selectedRooms={selectedRooms}
							onRoomSelect={(room) => {
								const isSelected = selectedRooms.some(
									r => r.shortname === room.shortname &&
										r.number === room.number
								);
								if (isSelected) {
									onSelectedRoomsChange(selectedRooms.filter(
										r => !(r.shortname === room.shortname &&
											r.number === room.number)
									));
								} else if (selectedRooms.length < 5) {
									onSelectedRoomsChange([...selectedRooms, room]);
								}
							}}
						/>
					</Box>
				</GlassCard>
			</Box>

			<MapContainer
				center={[49.2606, -123.2460]}
				zoom={15}
				style={{ width: '100%', height: '100%' }}
			>
				<TileLayer
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					attribution="&copy; OpenStreetMap contributors"
				/>

				{buildings.map((building, index) => (
					<Marker
						key={`${building.shortname}-${building.lat}-${building.lon}-${index}`}
						position={[building.lat, building.lon]}
						icon={selectedBuilding?.shortname === building.shortname ? highlightedIcon : defaultIcon}
						eventHandlers={{
							click: () => onBuildingMarkerClick(building)
						}}
					>
						<Popup closeButton={true}>
							<CustomPopup
								building={building}
								onBuildingSelect={onBuildingSelect}
								roomCount={getBuildingRoomCount(building.shortname)}
							/>
						</Popup>
					</Marker>
				))}

				{selectedRooms.length > 1 && <RoutingControl />}
			</MapContainer>
		</>
	);
};

export default MapComponent;