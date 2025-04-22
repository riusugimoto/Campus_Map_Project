import { useState, useEffect, useRef, useMemo } from 'react';
import {
	Typography,
	List,
	ListItemButton,
	ListItemText,
	Chip,
	IconButton,
	Box,
	Card,
	Fade,
	Zoom,
	Collapse,
	Tooltip,
	Grid,
	Stack,
	CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ChairIcon from '@mui/icons-material/Chair';
import RoomIcon from '@mui/icons-material/Room';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import TimerIcon from '@mui/icons-material/Timer';
import { Room } from '../../types/rooms';
import RoomFilter from "../RoomFilters/RoomFilters";
import { ChairRounded, People } from "@mui/icons-material";

interface Journey {
	totalTime: number;
	totalDistance: number;
	segments: RoomRelationship[];
}

interface RoomFilters {
	type: string[];
	furniture: string[];
	minSeats: number;
	maxSeats: number;
}

interface RoomRelationship {
	id: string;
	room1: Room;
	room2: Room;
	walkingTime?: number;
	distance?: number;
	sameBuilding: boolean;
	loading: boolean;
}

interface RoomShowcaseProps {
	rooms: Room[];
	onClearRooms: () => void;
	selectedRooms: Room[];
	onRoomSelect: (selectedRooms: Room[]) => void;
}

const MAX_SELECTION = 5;

const AnimatedCard = styled(Card)(({ theme }) => ({
	backgroundColor: 'rgba(66, 66, 66, 0.5)',
	transition: 'all 0.2s ease-in-out',
	'&:hover': {
		transform: 'translateY(-2px)',
		boxShadow: theme.shadows[8],
	}
}));

const AnimatedListItem = styled(ListItemButton)(({ theme }) => ({
	transition: 'all 0.2s ease-in-out',
	'&:hover': {
		transform: 'translateY(-2px)',
		backgroundColor: 'rgba(66, 66, 66, 0.9)',
	}
}));

const formatTime = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);
	return minutes > 0
		? `${minutes} min ${remainingSeconds > 0 ? `${remainingSeconds} sec` : ''}`
		: `${remainingSeconds} sec`;
};

const RoomInfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
	<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
		{icon}
		<Typography variant="body2" color="text.secondary">
			<strong>{label}:</strong> {value}
		</Typography>
	</Box>
);

const RoomShowcase = ({
						  rooms,
						  selectedRooms,
						  onRoomSelect,
						  onClearRooms
					  }: RoomShowcaseProps) => {
	const [selectedSection, setSelectedSection] = useState<'selected' | 'available' | 'relationships'>('available');
	const [relationships, setRelationships] = useState<RoomRelationship[]>([]);
	const [journeyMetrics, setJourneyMetrics] = useState<Journey | null>(null);
	const [filters, setFilters] = useState<RoomFilters>({
		type: [],
		furniture: [],
		minSeats: 0,
		maxSeats: Infinity
	});


	const roomMetadata = useMemo(() => ({
		types: [...new Set(rooms.map(room => room.type))].sort(),
		furniture: [...new Set(rooms.map(room => room.furniture))].sort(),
		maxCapacity: Math.max(...rooms.map(room => room.seats), 0)
	}), [rooms]);

	const filteredRooms = useMemo(() => {
		return rooms.filter(room => {
			const typeMatch = filters.type.length === 0 || filters.type.includes(room.type);
			const furnitureMatch = filters.furniture.length === 0 || filters.furniture.includes(room.furniture);
			const seatsMatch = room.seats >= filters.minSeats &&
				(filters.maxSeats === Infinity || room.seats <= filters.maxSeats);

			return typeMatch && furnitureMatch && seatsMatch;
		});
	}, [rooms, filters]);


	const handleFilterChange = (newFilters: RoomFilters) => {
		setFilters(newFilters);
	};

	useEffect(() => {
		if (selectedRooms.length >= 2) {
			calculateRoutes();
		} else {
			setRelationships([]);
			setJourneyMetrics(null);
		}
	}, [selectedRooms]);

	const calculateRoutes = async () => {
		const newRelations: RoomRelationship[] = [];
		let totalTime = 0;
		let totalDistance = 0;

		for (let i = 0; i < selectedRooms.length - 1; i++) {
			const room1 = selectedRooms[i];
			const room2 = selectedRooms[i + 1];
			const sameBuilding = room1.shortname === room2.shortname;
			const relationId = `${room1.shortname}-${room1.number}-to-${room2.shortname}-${room2.number}`;

			if (sameBuilding) {
				const walkingTime = 45; // seconds
				const distance = 30; // meters
				newRelations.push({
					id: relationId,
					room1,
					room2,
					walkingTime,
					distance,
					sameBuilding,
					loading: false
				});
				totalTime += walkingTime;
				totalDistance += distance;
			} else {
				try {
					const response = await fetch(
						`https://thingproxy.freeboard.io/fetch/https://api.openrouteservice.org/v2/directions/foot-walking`,
						{
							method: 'POST',
							headers: {
								'Authorization': '5b3ce3597851110001cf62483a25be3ea2f44742bf588e4c0fbad6fc',
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								coordinates: [
									[room1.lon, room1.lat],
									[room2.lon, room2.lat]
								]
							})
						}
					);

					if (response.ok) {
						const data = await response.json();
						const route = data.routes[0];
						const walkingTime = route.summary.duration;
						const distance = route.summary.distance;

						newRelations.push({
							id: relationId,
							room1,
							room2,
							walkingTime,
							distance,
							sameBuilding,
							loading: false
						});

						totalTime += walkingTime;
						totalDistance += distance;
					}
				} catch (error) {
					console.error('Error calculating route:', error);
					newRelations.push({
						id: relationId,
						room1,
						room2,
						sameBuilding,
						loading: false
					});
				}
			}
		}

		setRelationships(newRelations);
		setJourneyMetrics({
			totalTime,
			totalDistance,
			segments: newRelations
		});
	};

	const toggleRoomSelection = (room: Room) => {
		const isSelected = selectedRooms.some(
			(r) => r.shortname === room.shortname && r.number === room.number
		);

		if (isSelected) {
			onRoomSelect(selectedRooms.filter(
				r => !(r.shortname === room.shortname && r.number === room.number)
			));
		} else if (selectedRooms.length < MAX_SELECTION) {
			onRoomSelect([...selectedRooms, room]);
		}
	};

	return (
		<Box sx={{
			height: '100%',
			display: 'flex',
			flexDirection: 'column',
		}}>
			{/* Fixed Header Section */}
			<Box sx={{ p: 2, pb: 1 }}>
				<Fade in timeout={800}>
					<Box sx={{ mb: 2 }}>
						<Typography variant="h5" gutterBottom>
							Room Showcase
						</Typography>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							Select up to {MAX_SELECTION} rooms to view details and walking directions.
						</Typography>
					</Box>
				</Fade>

				<RoomFilter
					rooms={rooms}
					onFilterChange={handleFilterChange}
					metadata={roomMetadata}
					currentFilters={filters}
				/>

				{/* Navigation Chips */}
				<Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
					<Chip
						label={`Selected (${selectedRooms.length})`}
						onClick={() => setSelectedSection('selected')}
						color={selectedSection === 'selected' ? 'primary' : 'default'}
						icon={<RoomIcon />}
					/>
					<Chip
						label={`Available (${filteredRooms.length})`}
						onClick={() => setSelectedSection('available')}
						color={selectedSection === 'available' ? 'primary' : 'default'}
						icon={<MeetingRoomIcon />}
					/>
					{selectedRooms.length >= 2 && (
						<Chip
							label={`Routes (${relationships.length})`}
							onClick={() => setSelectedSection('relationships')}
							color={selectedSection === 'relationships' ? 'primary' : 'default'}
							icon={<DirectionsWalkIcon />}
						/>
					)}
				</Box>
			</Box>

			{/* Scrollable Content Section */}
			<Box sx={{
				flex: 1,
				overflowY: 'auto',
				px: 2,
				pb: 2,
			}}>
				{/* Selected Rooms Section */}
				<Collapse in={selectedSection === 'selected'}>
					<Stack spacing={2}>
						{selectedRooms.map((room, index) => (
							<Zoom
								in
								key={`${room.shortname}-${room.number}`}
								style={{ transitionDelay: `${index * 50}ms` }}
							>
								<AnimatedCard>
									<Box sx={{ p: 2, position: 'relative' }}>
										<Tooltip title="Remove Room">
											<IconButton
												size="small"
												onClick={() => toggleRoomSelection(room)}
												sx={{
													position: 'absolute',
													right: 8,
													top: 8,
													color: 'error.main',
													transition: 'all 0.2s ease-in-out',
													'&:hover': {
														transform: 'rotate(90deg)',
													}
												}}
											>
												<CloseIcon />
											</IconButton>
										</Tooltip>

										<Typography variant="h6" gutterBottom>
											{selectedRooms.indexOf(room) + 1}. {room.shortname} {room.number}
										</Typography>

										<Stack spacing={1}>
											<RoomInfoRow
												icon={<LocationOnIcon fontSize="small" />}
												label="Building"
												value={room.fullname}
											/>
											<RoomInfoRow
												icon={<ApartmentIcon fontSize="small" />}
												label="Type"
												value={room.type}
											/>
											<RoomInfoRow
												icon={<ChairIcon fontSize="small" />}
												label="Furniture"
												value={room.furniture}
											/>
											<RoomInfoRow
												icon={<People fontSize="small" />}
												label="Capacity"
												value={room.seats}
											/>
										</Stack>
									</Box>
								</AnimatedCard>
							</Zoom>
						))}
					</Stack>
				</Collapse>

				{/* Available Rooms Section */}
				<Collapse in={selectedSection === 'available'}>
					<List disablePadding>
						{filteredRooms.map((room, index) => (
							<Zoom
								in
								key={`${room.shortname}-${room.number}`}
								style={{ transitionDelay: `${index * 30}ms` }}
							>
								<AnimatedListItem
									onClick={() => toggleRoomSelection(room)}
									selected={selectedRooms.some(
										(r) => r.shortname === room.shortname && r.number === room.number
									)}
									sx={{
										mb: 1,
										borderRadius: 2,
										backgroundColor: 'rgba(50, 50, 50, 0.8)',
									}}
								>
									<ListItemText
										primary={`${room.shortname} ${room.number}`}
										secondary={
											<Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
												<Chip
													icon={<ApartmentIcon />}
													label={room.type}
													size="small"
													sx={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
												/>
												<Chip
													icon={<ChairRounded />}
													label={room.furniture}
													size="small"
													sx={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
												/>
												<Chip
													icon={<People />}
													label={room.seats}
													size="small"
													sx={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
												/>
											</Box>
										}
									/>
								</AnimatedListItem>
							</Zoom>
						))}
					</List>
				</Collapse>

				{/* Relationships Section */}
				<Collapse in={selectedSection === 'relationships' && journeyMetrics !== null}>
					<Stack spacing={2}>
						<AnimatedCard>
							<Box sx={{ p: 2 }}>
								<Typography variant="h6" gutterBottom>
									Total Journey
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<TimerIcon color="primary" />
										<Typography>
											{formatTime(journeyMetrics?.totalTime || 0)}
										</Typography>
									</Box>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<DirectionsWalkIcon color="primary" />
										<Typography>
											{Math.round(journeyMetrics?.totalDistance || 0)} m
										</Typography>
									</Box>
								</Box>
								<Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
									From {selectedRooms[0]?.shortname} {selectedRooms[0]?.number} to{' '}
									{selectedRooms[selectedRooms.length - 1]?.shortname} {selectedRooms[selectedRooms.length - 1]?.number}
								</Typography>
							</Box>
						</AnimatedCard>

						{relationships.map((relation) => (
							<Zoom
								in
								key={relation.id}
								style={{ transitionDelay: '50ms' }}
							>
								<AnimatedCard>
									<Box sx={{ p: 2 }}>
										<Grid container spacing={2}>
											<Grid item xs={12}>
												<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
													<TimerIcon color="primary" />
													{relation.loading ? (
														<CircularProgress size={20} />
													) : (
														<Typography variant="h6">
															{relation.walkingTime
																? formatTime(relation.walkingTime)
																: 'Unable to calculate route'}
														</Typography>
													)}
												</Box>
											</Grid>

											<Grid item xs={12}>
												<Stack spacing={1}>
													<Box>
														<Typography variant="subtitle2" color="primary">
															From
														</Typography>
														<Typography>
															{relation.room1.shortname} {relation.room1.number}
														</Typography>
													</Box>

													<Box>
														<Typography variant="subtitle2" color="primary">
															To
														</Typography>
														<Typography>
															{relation.room2.shortname} {relation.room2.number}
														</Typography>
													</Box>

													<Box sx={{ display: 'flex', gap: 1 }}>
														<Chip
															size="small"
															icon={<ApartmentIcon />}
															label={relation.sameBuilding ? "Same Building" : "Different Buildings"}
															color={relation.sameBuilding ? "success" : "default"}
														/>
														{relation.distance && (
															<Chip
																size="small"
																icon={<DirectionsWalkIcon />}
																label={relation.sameBuilding
																	? "Internal Route"
																	: `${Math.round(relation.distance)} m`}
																color={relation.sameBuilding ? "primary" : "default"}
															/>
														)}
													</Box>
												</Stack>
											</Grid>
										</Grid>
									</Box>
								</AnimatedCard>
							</Zoom>
						))}
					</Stack>
				</Collapse>
			</Box>
		</Box>
	);
};

export default RoomShowcase;
